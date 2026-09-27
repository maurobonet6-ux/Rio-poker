// Vídeo fijado: "Qué es RÍO en 25 segundos". Mismo estilo minimalista (negro, crema y rojo).
const { chromium } = require('@playwright/test');
// Uso: node video-que-es-rio.js   (antes: capturas-manos.js ak y capturas-web.js)
const fs = require('fs'), path = require('path'), { spawn, execFileSync } = require('child_process');
const { SALIDA, ffmpeg, unirAudio, fontRoute } = require('./comun.js');
const FF = ffmpeg(), FPS = 30, HERE = SALIDA, TOTAL = 24.1;
process.chdir(SALIDA);
const src = f => 'file://' + path.join(HERE, f);
const K = 692 / 400;                        // de las capturas (400 px de ancho) a la pantalla del móvil
const tap = (x, y, at) => `<div class="tap" data-at="${at}" style="left:${x * K}px;top:${y * K + 20}px"></div>`;

const html = `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,800&family=Space+Grotesk:wght@400;500;700&display=swap" rel="stylesheet"><style>
*{box-sizing:border-box;margin:0}
html,body{width:1080px;height:1920px;overflow:hidden}
body{background:radial-gradient(1100px 800px at 50% -6%, rgba(232,40,63,.30), transparent 60%), radial-gradient(900px 700px at 50% 75%, rgba(232,40,63,.08), transparent 65%), #0A0A0B;color:#F5F2EC;font-family:'Space Grotesk',sans-serif}
.brand{position:absolute;top:100px;left:0;right:0;display:flex;justify-content:center;align-items:center;gap:18px;font-family:'Bricolage Grotesque';font-weight:800;font-size:46px;z-index:10}
.brand i{font-style:normal;font-size:28px;font-weight:700;color:#E8283F;background:rgba(232,40,63,.14);border:2px solid rgba(232,40,63,.5);padding:8px 18px;border-radius:999px;letter-spacing:.06em;text-transform:uppercase}
[data-in]{position:absolute;display:none}
.center{left:60px;right:60px;top:0;bottom:0;flex-direction:column;align-items:center;justify-content:center;text-align:center}
.big{font-family:'Bricolage Grotesque';font-weight:800;font-size:96px;line-height:1.08}
.mid{font-family:'Bricolage Grotesque';font-weight:800;font-size:84px;line-height:1.08}
.sub{font-size:46px;color:rgba(245,242,236,.62);margin-top:26px;line-height:1.3} .sub b{color:#F5F2EC}
em{font-style:normal;color:#E8283F}
.w{display:inline-block;white-space:pre}
.logo{font-family:'Bricolage Grotesque';font-weight:800;font-size:260px;letter-spacing:.02em;text-shadow:0 0 80px rgba(232,40,63,.65)}
.logo span{color:#E8283F}
.cap{left:50px;right:50px;top:200px;text-align:center;flex-direction:column;align-items:center}
.cap .mid{font-size:80px}.cap .sub{font-size:42px;margin-top:14px}
#phone{left:180px;top:510px;width:720px;height:1270px;border-radius:78px;background:#1c1c20;padding:14px;box-shadow:0 0 0 2px rgba(245,242,236,.14),0 50px 120px rgba(0,0,0,.8),0 0 120px rgba(232,40,63,.12)}
#screen{position:relative;width:692px;height:1242px;border-radius:64px;overflow:hidden;background:#0A0A0B}
#screen .bar{position:absolute;left:0;right:0;top:0;height:100px;display:flex;align-items:flex-end;justify-content:space-between;padding:0 36px 14px;border-bottom:1px solid rgba(245,242,236,.08);font-family:'Bricolage Grotesque';font-weight:800;font-size:40px;z-index:3;background:#0A0A0B}
#screen .bar i{font-style:normal;font-size:34px;color:rgba(245,242,236,.6)}
#screen .notch{position:absolute;left:50%;top:14px;width:150px;height:34px;margin-left:-75px;border-radius:20px;background:#000;z-index:4}
.scr{position:absolute;left:0;right:0;top:100px;bottom:0;padding-top:20px;display:none}
.scr img{display:block;width:100%}
.scr.pad{padding:40px 24px}.scr.pad img{border-radius:24px;border:2px solid rgba(245,242,236,.1);background:#141416;padding:26px}
.tap{position:absolute;width:110px;height:110px;margin:-55px;border-radius:50%;border:5px solid #F5F2EC;opacity:0;z-index:5}
.tap:after{content:'';position:absolute;left:50%;top:50%;width:46px;height:46px;margin:-23px;border-radius:50%;background:rgba(245,242,236,.75)}
.scan{position:absolute;left:0;right:0;height:6px;background:#E8283F;box-shadow:0 0 30px 10px rgba(232,40,63,.55);z-index:4;opacity:0}
.list{flex-direction:column;gap:30px;margin-top:40px;align-items:stretch;width:880px}
.row{display:flex;align-items:center;gap:30px;background:#141416;border:2px solid rgba(245,242,236,.10);border-radius:30px;padding:34px 40px;font-size:50px;font-weight:700;text-align:left}
.row span{font-size:64px}
.url{margin-top:50px;font-family:'Bricolage Grotesque';font-weight:800;font-size:68px;background:linear-gradient(90deg,#E8283F,#ff6a5a);padding:30px 54px;border-radius:30px;color:#fff;box-shadow:0 20px 70px rgba(232,40,63,.5)}
.foot{font-size:32px;color:rgba(245,242,236,.45);margin-top:60px}
#flash{position:absolute;inset:0;background:#fff;opacity:0;z-index:30}
.pbar{position:absolute;left:0;bottom:0;height:14px;background:linear-gradient(90deg,#E8283F,#ff6a5a);z-index:40}
</style></head><body>
<div class="brand">RÍO <i>Poker study</i></div>

<div class="center" data-in="0" data-out="2.0" data-a="none" style="display:flex">
  <div class="big words" data-at="0.05">¿Perdiste la mano por <em>mala suerte</em>…</div>
  <div class="big words" data-at="0.7" style="margin-top:30px">…o por <em>mala jugada</em>? 🤔</div></div>
<div class="center" data-in="2.1" data-out="3.9" data-a="none">
  <div class="big words" data-at="0">Después de jugar, casi nadie sabe si <em>hizo lo correcto</em></div></div>
<div class="center" data-in="4.0" data-out="5.4" data-a="zoom">
  <div class="logo">R<span>Í</span>O</div><div class="sub rise" data-at="0.35" style="font-size:56px;margin-top:0">te lo dice <b>en segundos</b></div></div>

<div class="cap" data-in="5.5" data-out="7.9" data-a="none"><div class="mid words" data-at="0">📸 Sube una <em>captura</em></div><div class="sub rise" data-at="0.5">RÍO lee cartas, bote y apuestas</div></div>
<div class="cap" data-in="8.0" data-out="10.3" data-a="none"><div class="mid words" data-at="0">🎙️ O <em>cuéntale</em> la mano</div><div class="sub rise" data-at="0.4">por voz o por escrito</div></div>
<div class="cap" data-in="10.4" data-out="13.1" data-a="none"><div class="mid words" data-at="0">✍️ O elige tus <em>cartas</em></div><div class="sub rise" data-at="0.4">paso a paso · gratis</div></div>
<div class="cap" data-in="13.2" data-out="16.8" data-a="none"><div class="mid words" data-at="0.05">Y RÍO te dice <em>qué hacer</em></div><div class="sub rise" data-at="1.9">y por qué, explicado fácil</div></div>

<div id="phone" data-in="5.5" data-out="16.8" data-a="phone"><div id="screen"><div class="notch"></div><div class="bar">RÍO<i>☰</i></div>
  <div class="scr" data-s="5.5" data-e="8.0"><img src="${src('x-entry.png')}">${tap(200, 255, 6.6)}</div>
  <div class="scr" data-s="8.0" data-e="10.4"><img src="${src('x-story.png')}">${tap(200, 443, 9.5)}</div>
  <div class="scr" data-s="10.4" data-e="11.3"><img src="${src('x-pick1.png')}">${tap(64, 97, 10.85)}</div>
  <div class="scr" data-s="11.3" data-e="12.0"><img src="${src('x-pick2.png')}">${tap(290, 145, 11.6)}</div>
  <div class="scr pad" data-s="12.0" data-e="13.2"><img src="${src('ak-cards5.png')}"></div>
  <div class="scr" data-s="13.2" data-e="15.2"><img class="stampimg" src="${src('x-result.png')}"></div>
  <div class="scr" data-s="15.2" data-e="16.8"><img src="${src('x-why.png')}"></div>
</div></div>

<div class="center" data-in="16.9" data-out="20.3" data-a="none">
  <div class="mid words" data-at="0">Por qué <em>RÍO</em></div>
  <div class="list" style="display:flex">
    <div class="row pop" data-at="0.35"><span>🇪🇸</span>En español y fácil de entender</div>
    <div class="row pop" data-at="0.8"><span>🆓</span>Gratis para empezar</div>
    <div class="row pop" data-at="1.25"><span>📈</span>Aprende de tus errores</div></div></div>
<div class="center" data-in="20.4" data-out="99" data-a="zoom">
  <div class="big words" data-at="0.1">Pruébalo <em>gratis</em></div>
  <div class="url pop pulse" data-at="0.6">rio-poker.vercel.app</div>
  <div class="sub rise" data-at="0.9">👆 enlace en la bio</div>
  <div class="foot rise" data-at="1.2">Herramienta de estudio · analiza después de jugar</div></div>
<div id="flash"></div><div class="pbar"></div>
<script>
const TOTAL = ${TOTAL};
const E = { out: t => 1 - Math.pow(1 - t, 3), inOut: t => t < .5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3)/2,
  back: t => { const a = 1.9, b = a + 1; return 1 + b*Math.pow(t - 1, 3) + a*Math.pow(t - 1, 2); } };
const cl = x => Math.max(0, Math.min(1, x));
function setup(){
  document.querySelectorAll('.words').forEach(el => { const walk = n => [...n.childNodes].forEach(ch => {
    if (ch.nodeType === 3){ const f = document.createDocumentFragment();
      ch.textContent.split(/(\\s+)/).forEach(p => { if (!p) return; if (/^\\s+$/.test(p)) return f.appendChild(document.createTextNode(p));
        const s = document.createElement('span'); s.className = 'w'; s.textContent = p; f.appendChild(s); }); ch.replaceWith(f); }
    else if (ch.nodeType === 1) walk(ch); }); walk(el); });
}
function render(t){
  document.querySelectorAll('[data-in]').forEach(el => {
    const a = +el.dataset.in, b = +el.dataset.out, lt = t - a;
    if (t < a || t >= b){ el.style.display = 'none'; return; }
    el.style.display = 'flex'; if (el.id === 'phone') el.style.display = 'block';
    let op = 1, tr = '', blur = 0;
    const kind = el.dataset.a;
    if (kind === 'zoom'){ const p = E.out(cl(lt/0.4)); op = p; tr = 'scale(' + (0.85 + 0.15*p) + ')'; blur = 10*(1 - p); }
    if (kind === 'phone'){ const p = E.out(cl(lt/0.55)); tr = 'translateY(' + (900*(1 - p)) + 'px)'; }
    const outp = b - t < 0.22 ? E.inOut(cl(1 - (b - t)/0.22)) : 0;
    if (outp > 0){ op *= 1 - outp; blur += 10*outp; tr += ' scale(' + (1 + 0.06*outp) + ')'; }
    el.style.opacity = op; el.style.transform = tr; el.style.filter = blur > .2 ? 'blur(' + blur + 'px)' : 'none';
    el.querySelectorAll('.words').forEach(w => { const at = +w.dataset.at; w.querySelectorAll('.w').forEach((s, k) => {
      const p = cl((lt - at - k*0.06)/0.36), e = E.back(p); s.style.opacity = cl(p*2.2); s.style.transform = 'translateY(' + (40*(1 - e)) + 'px) scale(' + (0.7 + 0.3*e) + ')'; }); });
    el.querySelectorAll('.rise').forEach(x => { const p = E.out(cl((lt - +x.dataset.at)/0.45)); x.style.opacity = p; x.style.transform = 'translateY(' + (50*(1 - p)) + 'px)'; });
    el.querySelectorAll('.pop').forEach(x => { const q = lt - +x.dataset.at, p = cl(q/0.42), e = E.back(p);
      const pulse = x.classList.contains('pulse') && p >= 1 ? 1 + 0.035*Math.sin((q - .42)*6.5) : 1;
      x.style.opacity = cl(p*2); x.style.transform = 'scale(' + ((0.6 + 0.4*e)*pulse) + ')'; });
  });
  // Pantallas dentro del móvil
  document.querySelectorAll('.scr').forEach(s => { const a = +s.dataset.s, b = +s.dataset.e;
    if (t < a || t >= b){ s.style.display = 'none'; return; } s.style.display = 'block';
    const p = E.out(cl((t - a)/0.28)); s.style.opacity = p; s.style.transform = 'translateX(' + (70*(1 - p)) + 'px)';
    const img = s.querySelector('.stampimg'); if (img){ const q = E.out(cl((t - a - 0.1)/0.35)); img.style.transform = 'scale(' + (1.35 - 0.35*q) + ')'; img.style.opacity = cl(q*3); } });
  document.querySelectorAll('.tap').forEach(x => { const q = (t - +x.dataset.at)/0.5;
    x.style.opacity = q < 0 || q > 1 ? 0 : (q < .15 ? q/.15 : 1 - (q - .15)/.85); x.style.transform = 'scale(' + (0.6 + 0.8*cl(q)) + ')'; });
  document.querySelectorAll('.scan').forEach(x => { const q = (t - +x.dataset.at)/0.8;
    x.style.opacity = q < 0 || q > 1 ? 0 : Math.sin(Math.PI*q); x.style.top = (cl(q)*100) + '%'; });
  // Temblor y destello al mostrar el resultado
  const ph = document.getElementById('phone');
  if (t >= 13.2 && t < 13.5){ const k = 1 - (t - 13.2)/0.3; ph.style.transform += ' translate(' + Math.sin(t*95)*12*k + 'px,' + Math.cos(t*80)*8*k + 'px)'; }
  document.getElementById('flash').style.opacity = t >= 13.18 && t < 13.4 ? 0.55*(1 - (t - 13.18)/0.22) : 0;
  document.querySelector('.pbar').style.width = (100*t/TOTAL) + '%';
}
</script></body></html>`;

(async () => {
  const f = path.join(HERE, 'explica.html'); fs.writeFileSync(f, html);
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  await p.route('**/*', r => fontRoute(r) || r.continue());
  await p.goto('file://' + f); await p.evaluate(() => document.fonts.ready);
  await p.evaluate(() => Promise.all([...document.images].map(i => i.decode()))); await p.evaluate(() => setup());
  if (process.env.SNAP){ fs.mkdirSync(path.join(HERE, 'snap'), { recursive: true }); for (const t of process.env.SNAP.split(',')){ await p.evaluate(x => render(x), +t); await p.screenshot({ path: path.join(HERE, 'snap', 'e-' + t + '.png') }); } await b.close(); return; }
  const out = path.join(HERE, 'rio-explica-mudo.mp4');
  const ff = spawn(FF, ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-', '-vf', 'format=yuv420p', '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  for (let i = 0; i < Math.round(TOTAL*FPS); i++){ await p.evaluate(x => render(x), i/FPS);
    const buf = await p.screenshot({ type: 'jpeg', quality: 94 }); if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r)); }
  ff.stdin.end(); await new Promise(r => ff.on('close', r)); await b.close();
  fs.rmSync(f);
  const wav = path.join(HERE, 'que-es-rio.wav'), final = path.join(HERE, 'rio-que-es-rio.mp4');
  execFileSync('python3', [path.join(__dirname, 'audio_que_es_rio.py'), wav]);
  unirAudio(out, wav, final);
  console.log(final);
})();
