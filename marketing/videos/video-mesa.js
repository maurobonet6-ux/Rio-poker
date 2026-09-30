// Vídeo "¿Qué harías tú?" en una mesa minimalista con los colores de RÍO.
// Uso: node video-mesa.js <mano>   (la mano tiene que estar en manos.js y analizada con capturas-manos.js)
const { chromium } = require('@playwright/test');
const fs = require('fs'), path = require('path'), { spawn, execFileSync } = require('child_process');
const { SALIDA, ffmpeg, unirAudio, fontRoute } = require('./comun.js');
const FF = ffmpeg(), FPS = 30, HERE = SALIDA;
process.chdir(SALIDA);

const HN = process.argv[2] || 'ak';
const infoFull = JSON.parse(fs.readFileSync(HN + '-info.json', 'utf8')), info = infoFull.why;
const n = (s, re) => (s.match(re) || [])[1];
const fz = info.find(x => x.startsWith('⚠️'));
const G = { badge: infoFull.badge, ganas: n(info[0], /Ganas ~(\d+)%/), nec: n(info[0], /necesitas (\d+)%/), fz: fz && n(fz, /ganas ~(\d+)%/),
  ev: (/pierde/.test(info[1]) ? '−' : '+') + n(info[1], /de media ([\d,]+)/) };
// FIN: cuándo empieza el final (por defecto 13.5 s). Con voz en off se alarga para que dé tiempo a decirlo todo.
const FIN = +(process.env.FIN || 13.5);
const H = { ...require('./manos-lista.js').cargar()[HN].guion(G), END: FIN, TOTAL: FIN + 3.8 };
H.caps[H.caps.length - 1].to = FIN - 0.1;

const RED = s => s === '♥' || s === '♦';
const card = (id, [r, s], cls = '') => `<div class="card ${cls}" id="${id}"><div class="face ${RED(s) ? 'red' : ''}">
  <div class="rk">${r}<i>${s}</i></div><div class="su">${s}</div><div class="shine"></div></div><div class="back"><div class="mono">R</div></div></div>`;
const chips = (id, colors) => `<div class="stack" id="${id}">${colors.map((c, i) => `<div class="chip" style="--c:${c[0]};--d:${c[1]};--s:${c[2]};transform:translateY(${-i * 8}px)"></div>`).join('')}</div>`;

const CSS = `
*{box-sizing:border-box;margin:0}
html,body{width:1080px;height:1920px;overflow:hidden}
body{background:radial-gradient(1100px 800px at 50% -6%, rgba(232,40,63,.30), transparent 60%), radial-gradient(900px 700px at 50% 70%, rgba(232,40,63,.07), transparent 65%), #0A0A0B;color:#F5F2EC;font-family:'Space Grotesk',sans-serif}
.brand{position:absolute;top:100px;left:0;right:0;display:flex;justify-content:center;align-items:center;gap:18px;font-family:'Bricolage Grotesque';font-weight:800;font-size:46px;z-index:10}
.brand i{font-style:normal;font-size:28px;font-weight:700;color:#E8283F;background:rgba(232,40,63,.14);border:2px solid rgba(232,40,63,.5);padding:8px 18px;border-radius:999px;letter-spacing:.06em;text-transform:uppercase}
.cap{position:absolute;top:200px;left:50px;right:50px;text-align:center;z-index:10}
.cap .t{font-family:'Bricolage Grotesque';font-weight:800;font-size:84px;line-height:1.07}
.cap .s{font-size:42px;color:rgba(245,242,236,.62);margin-top:16px} .cap .s b{color:#F5F2EC}
em{font-style:normal;color:#E8283F} .g{color:#3DDC7A} .y{color:#D8A63B}
.w{display:inline-block;white-space:pre}
#world{position:absolute;inset:0;perspective:1700px;perspective-origin:50% 40%}
#table{position:absolute;left:60px;top:640px;width:960px;height:1010px;transform-origin:50% 60%;transform:rotateX(24deg);transform-style:preserve-3d}
#rail{position:absolute;inset:0;border-radius:480px/430px;background:#141416;border:2px solid rgba(245,242,236,.10);box-shadow:0 60px 120px rgba(0,0,0,.75)}
#felt{position:absolute;inset:34px;border-radius:446px/396px;overflow:hidden;background:radial-gradient(ellipse at 50% 40%, #1d1d21 0%, #161619 60%, #111113 100%);box-shadow:inset 0 0 0 2px rgba(232,40,63,.55)}
#felt .line{position:absolute;inset:64px;border-radius:380px/330px;border:2px solid rgba(245,242,236,.06)}
#felt .logo{position:absolute;left:0;right:0;top:58%;text-align:center;font-family:'Bricolage Grotesque';font-weight:800;font-size:110px;letter-spacing:.08em;color:rgba(245,242,236,.045)}
.card{position:absolute;width:150px;height:212px;margin:-106px 0 0 -75px;transform-style:preserve-3d;z-index:3}
.card.hero{width:196px;height:276px;margin:-138px 0 0 -98px}
.card.vill{width:112px;height:158px;margin:-79px 0 0 -56px}
.face,.back{position:absolute;inset:0;border-radius:20px;backface-visibility:hidden;box-shadow:0 14px 30px rgba(0,0,0,.55);overflow:hidden}
.face{background:#F5F2EC;color:#0A0A0B;border:3px solid #E8283F}
.face.red{color:#E8283F}
.rk{position:absolute;top:12px;left:16px;font-family:'Bricolage Grotesque';font-weight:800;font-size:64px;line-height:.9}
.rk i{display:block;font-style:normal;font-size:36px;margin-top:6px}
.su{position:absolute;right:14px;bottom:8px;font-size:92px;line-height:1}
.card.hero .rk{font-size:84px;left:20px}.card.hero .rk i{font-size:46px}.card.hero .su{font-size:124px;right:16px}
.shine{position:absolute;inset:-40%;background:linear-gradient(115deg,transparent 42%,rgba(255,255,255,.8) 50%,transparent 58%);transform:translateX(-120%);pointer-events:none}
.back{transform:rotateY(180deg);background:linear-gradient(160deg,#E8283F,#b3162b);border:3px solid rgba(245,242,236,.9)}
.back:before{content:'';position:absolute;inset:9px;border-radius:13px;border:2px solid rgba(245,242,236,.35)}
.back .mono{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-family:'Bricolage Grotesque';font-weight:800;font-size:56px;color:rgba(245,242,236,.9)}
.card.vill .back .mono{font-size:42px}
.ghost{position:absolute;width:150px;height:212px;margin:-106px 0 0 -75px;border:3px dashed rgba(245,242,236,.14);border-radius:20px}
.ghost span{position:absolute;bottom:-46px;left:0;right:0;text-align:center;font-weight:700;font-size:26px;letter-spacing:.1em;color:rgba(245,242,236,.35)}
.stack{position:absolute;width:76px;height:76px;margin:-38px 0 0 -38px;z-index:2}
.chip{position:absolute;inset:0;border-radius:50%;background:radial-gradient(circle,var(--c) 0 60%,transparent 61%),repeating-conic-gradient(var(--c) 0 30deg,var(--s) 30deg 45deg);box-shadow:0 4px 0 var(--d),0 10px 16px rgba(0,0,0,.45)}
.chip:before{content:'';position:absolute;inset:17px;border-radius:50%;border:2px solid var(--s);opacity:.55}
#dealer{position:absolute;width:74px;height:74px;margin:-37px;border-radius:50%;background:#F5F2EC;color:#0A0A0B;display:flex;align-items:center;justify-content:center;font-family:'Bricolage Grotesque';font-weight:800;font-size:40px;box-shadow:0 5px 0 #b9b3a8,0 10px 16px rgba(0,0,0,.45)}
.lbl{position:absolute;transform:translate(-50%,-50%);background:#0A0A0B;border:2px solid rgba(245,242,236,.16);color:#F5F2EC;padding:8px 22px;border-radius:999px;font-weight:700;font-size:40px;white-space:nowrap;z-index:4}
.seat{position:absolute;left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:18px;background:#141416;border:2px solid rgba(245,242,236,.10);border-radius:999px;padding:12px 30px 12px 12px;z-index:6;box-shadow:0 12px 30px rgba(0,0,0,.6)}
.seat .av{width:76px;height:76px;border-radius:50%;background:#1c1c20;box-shadow:0 0 0 3px #E8283F;position:relative;overflow:hidden}.seat .av:before{content:'';position:absolute;left:26px;top:15px;width:24px;height:24px;border-radius:50%;background:rgba(245,242,236,.8)}.seat .av span{position:absolute;left:14px;top:44px;width:48px;height:40px;border-radius:24px 24px 0 0;background:rgba(245,242,236,.8)}
.seat b{display:block;font-size:34px}.seat small{font-size:28px;color:#aaa}
.seat .act{margin-left:10px;font-weight:800;font-size:32px;color:#ff3b50}
#bar{position:absolute;left:60px;right:60px;bottom:120px;display:flex;gap:28px;z-index:8}
.btn{flex:1;padding:36px 0;border-radius:26px;text-align:center;font-family:'Bricolage Grotesque';font-weight:800;font-size:56px;letter-spacing:.02em;box-shadow:0 14px 40px rgba(0,0,0,.6)}
.btn.fold{background:#141416;border:2px solid rgba(245,242,236,.28);color:#F5F2EC}.btn.call{background:linear-gradient(90deg,#E8283F,#ff6a5a);color:#fff;box-shadow:0 18px 50px rgba(232,40,63,.45)}
#dim{position:absolute;inset:0;background:#000;opacity:0;z-index:7}
#ring{position:absolute;left:50%;top:1000px;width:330px;height:330px;margin:-165px;z-index:9}
#ring svg{position:absolute;inset:0;transform:rotate(-90deg)}#ring circle{fill:rgba(0,0,0,.35);stroke-width:12}#ring .track{stroke:rgba(255,255,255,.15)}#ring .prog{fill:none;stroke:#e8283f;stroke-linecap:round;stroke-dasharray:553}
.num{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-family:'Bricolage Grotesque';font-weight:800;font-size:210px;text-shadow:0 0 60px rgba(232,40,63,.8)}
#pill{position:absolute;left:50%;top:1230px;transform:translateX(-50%);font-size:44px;font-weight:700;background:#f5f2ec;color:#0d0d10;padding:20px 42px;border-radius:999px;z-index:9;white-space:nowrap}
#verdict{position:absolute;left:90px;right:90px;top:820px;z-index:9;background:rgba(20,20,22,.96);border:2px solid rgba(245,242,236,.12);border-radius:40px;padding:40px;box-shadow:0 30px 90px rgba(0,0,0,.7);text-align:center}
#verdict .badge{display:inline-block;font-family:'Bricolage Grotesque';font-weight:800;font-size:90px;color:#D8A63B;background:rgba(216,166,59,.16);padding:14px 60px;border-radius:999px}
#verdict .rec{font-size:40px;margin-top:20px}
#verdict .stats{display:flex;gap:20px;margin-top:30px}
#verdict .st{flex:1;background:#0A0A0B;border:1px solid rgba(245,242,236,.08);border-radius:24px;padding:22px 10px}
#verdict .st b{display:block;font-family:'Bricolage Grotesque';font-size:66px}#verdict .st > span{font-size:30px;color:#aaa}
#verdict .brandsm{font-size:28px;color:#E8283F;font-weight:700;letter-spacing:.08em;margin-bottom:14px}
#cta{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:radial-gradient(1100px 900px at 50% 0%, rgba(232,40,63,.35), transparent 60%),#0d0d10;z-index:20}
#cta .t{font-family:'Bricolage Grotesque';font-weight:800;font-size:96px}
#cta .s{font-size:54px;color:#c9c4bb;margin-top:20px}#cta .s b{color:#fff}
#cta .url{margin-top:50px;font-family:'Bricolage Grotesque';font-weight:800;font-size:68px;background:linear-gradient(90deg,#e8283f,#ff6a5a);padding:30px 54px;border-radius:30px;color:#fff;box-shadow:0 20px 70px rgba(232,40,63,.5)}
#cta .a{margin-top:34px;font-size:42px;color:#c9c4bb}
#cta .f{position:absolute;bottom:170px;font-size:32px;color:#8f8a82}
#flash{position:absolute;inset:0;background:#fff;opacity:0;z-index:30}
.pbar{position:absolute;left:0;bottom:0;height:14px;background:linear-gradient(90deg,#e8283f,#ff6a5a);z-index:40}
`;

const W = 940, CX = 470;
const BOARD = H.board.map((c, i) => ({ x: CX + (i - 2) * 168, y: 420 }));
const html = `<!doctype html><html><head><meta charset="utf-8"><link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet"><style>${CSS}</style></head><body>
<div id="world"><div id="table"><div id="rail"></div><div id="felt"><div class="line"></div><div class="logo">RÍO</div></div>
  <div id="dealer">D</div>
  ${[0, 1, 2, 3, 4].filter(i => i >= H.board.length).map(i => `<div class="ghost" style="left:${CX + (i - 2) * 168}px;top:420px"><span>${i === 3 ? "TURN" : i === 4 ? "RIVER" : i === 1 ? "FLOP" : ""}</span></div>`).join("")}
  ${chips('pot', [['#2a2a30','#141416','#F5F2EC'],['#E8283F','#8f1426','#F5F2EC'],['#F5F2EC','#b9b3a8','#E8283F'],['#E8283F','#8f1426','#F5F2EC'],['#2a2a30','#141416','#F5F2EC'],['#E8283F','#8f1426','#F5F2EC']])}
  <div class="lbl" id="potlbl">${H.pots[0]}</div>
  ${chips('vbet', Array.from({ length: H.vchips }, (_, i) => i % 3 === 2 ? ['#2a2a30','#141416','#F5F2EC'] : ['#E8283F','#8f1426','#F5F2EC']))}
  <div class="lbl" id="vbetlbl">${H.bet}</div>
  ${chips('hbet', [['#F5F2EC','#b9b3a8','#E8283F'],['#F5F2EC','#b9b3a8','#E8283F'],['#2a2a30','#141416','#F5F2EC'],['#F5F2EC','#b9b3a8','#E8283F']])}
  ${card('v0', ['?', '?'], 'vill')}${card('v1', ['?', '?'], 'vill')}
  ${H.board.map((c, i) => card('b' + i, c)).join('')}
  ${H.hero.map((c, i) => card('h' + i, c, 'hero')).join('')}
</div></div>
<div class="seat" id="vseat" style="top:500px"><div class="av"><span></span></div><div><b>Rival</b><small id="vstack">${H.vstack0}</small></div><div class="act" id="vact"></div></div>
<div id="dim"></div>
<div id="bar"><div class="btn fold" id="bfold">TIRAR</div><div class="btn call" id="bcall">${H.call}</div></div>
<div id="ring"><svg viewBox="0 0 200 200"><circle cx="100" cy="100" r="88" class="track"/><circle cx="100" cy="100" r="88" class="prog"/></svg><div class="num" data-n="3">3</div><div class="num" data-n="2">2</div><div class="num" data-n="1">1</div></div>
<div id="pill">Comenta tu respuesta 👇</div>
<div id="verdict"><div class="brandsm">ANÁLISIS DE RÍO</div><div class="badge" style="${H.fold ? "color:#FF4757;background:rgba(255,71,87,.16)" : ""}">${H.badge}</div><div class="rec">${H.rec}</div>
  <div class="stats"><div class="st"><b><span class="count" data-to="${G.ganas}" data-at="9.6">0</span>%</b><span>Ganas</span></div><div class="st"><b><span class="count" data-to="${G.nec}" data-at="9.6">0</span>%</b><span>Necesitas</span></div><div class="st"><b style="color:${H.fold ? "#FF4757" : "#3DDC7A"}">${G.ev}</b><span>fichas de media</span></div></div></div>
<div class="brand">RÍO <i>¿Qué harías tú?</i></div>
${H.caps.map((c, i) => `<div class="cap" id="c${i}"><div class="t words">${c.t}</div>${c.sub ? `<div class="s">${c.sub}</div>` : ''}</div>`).join('')}
<div id="cta"><div class="t words">¿Y tus manos?</div><div class="s">Analízalas <b>gratis</b> en segundos</div><div class="url">riopoker.es</div><div class="a">👆 enlace en la bio</div><div class="f">Herramienta de estudio · analiza después de jugar</div></div>
<div id="flash"></div><div class="pbar"></div>
<script>
const H = ${JSON.stringify({ caps: H.caps, END: H.END, TOTAL: H.TOTAL, pots: H.pots, vact: H.vact, fold: H.fold, vstack0: H.vstack0, vstack: H.vstack })};
const BOARD = ${JSON.stringify(BOARD)};
const E = { out: t => 1 - Math.pow(1 - t, 3), inOut: t => t < .5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3)/2,
  back: t => { const a = 1.9, b = a + 1; return 1 + b*Math.pow(t - 1, 3) + a*Math.pow(t - 1, 2); } };
const cl = x => Math.max(0, Math.min(1, x)), lerp = (a, b, p) => a + (b - a)*p;
const $ = id => document.getElementById(id);
const DECK = { x: 300, y: 300 };
function setup(){
  document.querySelectorAll('.words').forEach(el => {
    const walk = node => [...node.childNodes].forEach(ch => {
      if (ch.nodeType === 3){ const f = document.createDocumentFragment();
        ch.textContent.split(/(\\s+)/).forEach(p => { if (!p) return; if (/^\\s+$/.test(p)) return f.appendChild(document.createTextNode(p));
          const s = document.createElement('span'); s.className = 'w'; s.textContent = p; f.appendChild(s); }); ch.replaceWith(f); }
      else if (ch.nodeType === 1 && ch.classList.contains('count')) ch.classList.add('w');
      else if (ch.nodeType === 1) walk(ch); });
    walk(el);
  });
}
function place(el, x, y, extra = ''){ el.style.left = x + 'px'; el.style.top = y + 'px'; el.style.transform = extra; }
// Carta que vuela desde la baraja y (si flipAt) se da la vuelta.
function deal(el, t, at, x, y, rot, flipAt){
  const p = E.out(cl((t - at)/0.38));
  el.style.opacity = t < at ? 0 : 1;
  const f = flipAt == null ? 0 : E.inOut(cl((t - flipAt)/0.3));
  const lift = Math.sin(Math.PI*f)*40;
  place(el, lerp(DECK.x, x, p), lerp(DECK.y, y, p), 'translateZ(' + lift + 'px) rotateZ(' + lerp(-160, rot, p) + 'deg) rotateY(' + (180 - 180*f) + 'deg) scale(' + (1 + 0.08*Math.sin(Math.PI*f)) + ')');
}
function words(root, t, at){ root.querySelectorAll('.w').forEach((s, k) => { const p = cl((t - at - k*0.07)/0.38), e = E.back(p);
  s.style.opacity = cl(p*2.2); s.style.transform = 'translateY(' + (40*(1-e)) + 'px) scale(' + (0.7 + 0.3*e) + ')'; }); }
function render(t){
  // Cartas: tú (grandes, abajo) y el rival (arriba, boca abajo)
  deal($('h0'), t, 0.45, 390, 800, -7, 1.35); deal($('h1'), t, 0.75, 560, 805, 6, 1.5);
  if (H.fold && t >= 9.3){ const m = E.inOut(cl((t - 9.3)/0.5));
    [['h0', 390, -7], ['h1', 560, 6]].forEach(([id, x, r]) => { const el = $(id); place(el, lerp(x, 470, m), lerp(800, 560, m), 'rotateZ(' + lerp(r, r*6, m) + 'deg) rotateY(' + (180*m) + 'deg) scale(' + (1 - 0.35*m) + ')'); el.style.opacity = 1 - 0.8*m; }); }
  [['h0', 1.7], ['h1', 1.85], ...BOARD.map((b, i) => ['b' + i, 2.9 + i*0.15])].forEach(([id, at]) => { const p = cl((t - at)/0.6); $(id).querySelector('.shine').style.transform = 'translateX(' + (-120 + 240*E.inOut(p)) + '%)'; });
  deal($('v0'), t, 0.6, 430, 140, 4, null); deal($('v1'), t, 0.9, 520, 140, -5, null);
  H.caps; BOARD.forEach((b, i) => deal($('b' + i), t, 2.0 + i*0.15, b.x, b.y, 0, 2.55 + i*0.16));
  place($('dealer'), 740, 740);
  // Bote
  const pp = E.out(cl((t - 0.2)/0.5)); const potDone = E.out(cl((t - 9.35)/0.5));
  place($('pot'), 400, 600, 'scale(' + (0.6 + 0.4*pp) + ')'); $('pot').style.opacity = pp;
  const lbl = $('potlbl'); place(lbl, 580, 600, 'translate(-50%,-50%) scale(' + (0.6 + 0.4*pp) + ')'); lbl.style.opacity = pp;
  lbl.textContent = t < 4.3 ? H.pots[0] : t < 9.6 ? H.pots[1] : H.pots[2];
  // Apuesta del rival: sus fichas avanzan hacia el centro
  const vb = E.out(cl((t - 3.8)/0.55)), vm = E.inOut(cl((t - 9.4)/0.5));
  $('vbet').style.opacity = t < 3.8 ? 0 : 1 - vm;
  place($('vbet'), lerp(470, 400, vm), lerp(lerp(-40, 270, vb), 590, vm));
  const vl = E.back(cl((t - 4.3)/0.35));
  place($('vbetlbl'), 560, 270, 'translate(-50%,-50%) scale(' + vl + ')'); $('vbetlbl').style.opacity = t < 4.3 || t > 9.4 ? 0 : 1;
  $('vact').textContent = t >= 4.0 ? H.vact : ''; $('vstack').textContent = t >= 4.0 ? H.vstack : H.vstack0;
  $('vseat').style.opacity = 1 - E.out(cl((t - 10.6)/0.3));
  // Tu pago: tus fichas van al bote
  const hb = E.out(cl((t - 9.3)/0.5)), hm = E.inOut(cl((t - 9.8)/0.45));
  $('hbet').style.opacity = H.fold || t < 9.3 ? 0 : 1 - hm;
  place($('hbet'), lerp(470, 400, hm), lerp(lerp(1060, 660, hb), 600, hm));
  // Barra de acción
  const bar = E.out(cl((t - 5.0)/0.45)); $('bar').style.opacity = t >= H.END ? 0 : bar;
  $('bar').style.transform = 'translateY(' + (160*(1 - bar)) + 'px)';
  const pulse = t > 6.2 && t < 9.2 ? 1 + 0.03*Math.sin(t*7) : 1;
  const press = t >= 9.2 && t < 9.45 ? 0.93 : 1;
  const [bOn, bOff] = H.fold ? [$('bfold'), $('bcall')] : [$('bcall'), $('bfold')];
  bOn.style.transform = 'scale(' + (pulse*press) + ')';
  bOn.style.boxShadow = t >= 9.2 ? '0 0 0 6px #F5F2EC, 0 0 70px rgba(232,40,63,.8)' : '';
  bOff.style.transform = 'scale(' + pulse + ')';
  bOff.style.opacity = t >= 9.2 ? 0.35 : 1;
  // Cuenta atrás
  const inC = t >= 6.2 && t < 9.2;
  $('dim').style.opacity = inC ? 0.45*E.out(cl((t - 6.2)/0.3)) : (t >= 9.2 && t < H.END ? 0.55*E.out(cl((t - 9.3)/0.4)) : 0);
  $('ring').style.display = inC ? 'block' : 'none'; $('pill').style.display = inC ? 'block' : 'none';
  if (inC){ const lt = t - 6.2; document.querySelector('#ring .prog').style.strokeDashoffset = 553*cl(lt/3);
    document.querySelectorAll('#ring .num').forEach(nm => { const q = lt - (3 - +nm.dataset.n), on = q >= 0 && q < 1;
      nm.style.display = on ? 'flex' : 'none'; if (on){ const e = E.back(cl(q/0.3)); nm.style.transform = 'scale(' + (1.7 - 0.7*e) + ')'; nm.style.opacity = cl(q/0.12)*(q > .82 ? cl((1 - q)/0.18) : 1); } });
    const pp2 = E.back(cl((lt - 0.3)/0.4)); $('pill').style.transform = 'translateX(-50%) scale(' + pp2 + ')'; }
  // Veredicto de RÍO
  const v = cl((t - 9.4)/0.35), ve = E.out(v);
  $('verdict').style.opacity = t < 9.4 || t >= H.END ? 0 : cl(v*3);
  $('verdict').style.transform = 'scale(' + (2.0 - 1.0*ve) + ') rotate(' + (-7*(1 - ve)) + 'deg)';
  document.querySelectorAll('.count').forEach(x => { const p = E.out(cl((t - +x.dataset.at)/0.9)); x.textContent = Math.round(+x.dataset.to*p); });
  // Temblor al revelar
  let sx = 0, sy = 0; if (t >= 9.4 && t < 9.7){ const k = 1 - (t - 9.4)/0.3; sx = Math.sin(t*95)*14*k; sy = Math.cos(t*80)*9*k; }
  // Mesa: pequeño movimiento de cámara continuo
  const cam = 1 + 0.04*cl(t/H.END);
  $('world').style.transform = 'translate(' + sx + 'px,' + sy + 'px) scale(' + cam + ')';
  // Títulos
  H.caps.forEach((c, i) => { const el = $('c' + i); const vis = t >= c.at && t < c.to + 0.2;
    el.style.display = vis ? 'block' : 'none'; if (!vis) return;
    const outp = cl((t - c.to)/0.2); el.style.opacity = 1 - outp;
    if (c.stamp){ const p = E.out(cl((t - c.at)/0.32)); el.querySelector('.t').style.transform = 'scale(' + (2.3 - 1.3*p) + ') rotate(' + (-9*(1 - p)) + 'deg)'; el.querySelector('.t').style.opacity = cl(p*3); }
    else words(el.querySelector('.t'), t, c.at);
    const s = el.querySelector('.s'); if (s){ const p = E.out(cl((t - (c.subAt || c.at))/0.45)); s.style.opacity = p; s.style.transform = 'translateY(' + (40*(1 - p)) + 'px)'; } });
  // Final
  const ce = E.out(cl((t - H.END)/0.35));
  $('cta').style.display = t >= H.END ? 'flex' : 'none';
  $('cta').style.opacity = ce; $('cta').style.transform = 'scale(' + (0.88 + 0.12*ce) + ')';
  if (t >= H.END){ words($('cta').querySelector('.t'), t, H.END + 0.1);
    const u = $('cta').querySelector('.url'), up = cl((t - H.END - 0.7)/0.45), ue = E.back(up);
    u.style.opacity = cl(up*2); u.style.transform = 'scale(' + ((0.5 + 0.5*ue)*(up >= 1 ? 1 + 0.035*Math.sin((t - H.END - 1.15)*6.5) : 1)) + ')';
    [['.s', 0.4], ['.a', 1.0], ['.f', 1.2]].forEach(([q, a]) => { const e = $('cta').querySelector(q), p = E.out(cl((t - H.END - a)/0.5)); e.style.opacity = p; e.style.transform = 'translateY(' + (60*(1 - p)) + 'px)'; }); }
  // Destello y barra de progreso
  $('flash').style.opacity = t >= 9.2 && t < 9.45 ? 0.7*(1 - (t - 9.2)/0.25) : 0;
  document.querySelector('.pbar').style.width = (100*t/H.TOTAL) + '%';
}
</script></body></html>`;

(async () => {
  const f = path.join(HERE, 'mesa-' + HN + '.html'); fs.writeFileSync(f, html);
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  await p.route('**/*', r => fontRoute(r) || r.continue());
  await p.goto('file://' + f); await p.evaluate(() => document.fonts.ready); await p.evaluate(() => setup());
  if (process.env.SNAP){ fs.mkdirSync(path.join(HERE, 'snap'), { recursive: true }); for (const t of process.env.SNAP.split(',')){ await p.evaluate(x => render(x), +t); await p.screenshot({ path: path.join(HERE, 'snap', 'm-' + HN + '-' + t + '.png') }); } await b.close(); return; }
  const out = path.join(HERE, 'rio-' + HN + '-mudo.mp4');
  const ff = spawn(FF, ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-', '-vf', 'format=yuv420p', '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const frames = Math.round(H.TOTAL*FPS);
  for (let i = 0; i < frames; i++){ await p.evaluate(x => render(x), i/FPS);
    const buf = await p.screenshot({ type: 'jpeg', quality: 94 }); if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r)); }
  ff.stdin.end(); await new Promise(r => ff.on('close', r)); await b.close();
  fs.rmSync(f);
  const wav = path.join(HERE, HN + '.wav'), final = path.join(HERE, 'rio-' + HN + '.mp4');
  execFileSync('python3', [path.join(__dirname, 'audio_mesa.py'), String(H.board.length), wav, String(H.TOTAL), String(H.END)]);
  unirAudio(out, wav, final);
  console.log(final);
})();
