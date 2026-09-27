// Portada del vídeo «Qué es RÍO» (1080×1920) con la identidad de la web: logo RÍO en degradado,
// «CALL, RAISE o FOLD», la pica del icono y el brillo rojo. Lo importante va en la zona central 3:4
// (lo que se ve en la cuadrícula del perfil).
// Uso: node portada.js   (antes: capturas-web.js)
const { chromium } = require('@playwright/test');
const fs = require('fs'), path = require('path');
const { SALIDA, fontRoute } = require('./comun.js');
const src = f => 'file://' + path.join(SALIDA, f);
const PICA = '<svg viewBox="0 0 100 110"><path fill="currentColor" d="M50 2C38 22 6 38 6 62c0 14 11 24 24 24 7 0 13-3 17-8-2 11-7 19-15 24h36c-8-5-13-13-15-24 4 5 10 8 17 8 13 0 24-10 24-24C94 38 62 22 50 2z"/></svg>';
const html = `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,800&family=Space+Grotesk:wght@400;500;700&display=swap" rel="stylesheet"><style>
*{box-sizing:border-box;margin:0}
html,body{width:1080px;height:1920px;overflow:hidden}
body{position:relative;background:radial-gradient(900px 800px at 8% 10%, rgba(232,40,63,.42), transparent 62%), radial-gradient(800px 700px at 100% 100%, rgba(232,40,63,.16), transparent 60%), #0A0A0B;color:#F5F2EC;font-family:'Space Grotesk',sans-serif}
.marca{position:absolute;right:-120px;top:360px;width:640px;color:rgba(232,40,63,.10)}
.col{position:absolute;left:0;right:0;top:270px;display:flex;flex-direction:column;align-items:center;text-align:center}
.pica{width:92px;color:#E8283F;filter:drop-shadow(0 0 30px rgba(232,40,63,.6))}
.logo{font-family:'Bricolage Grotesque';font-weight:800;font-size:290px;letter-spacing:-.02em;line-height:.9;margin-top:18px;
  background:linear-gradient(100deg,#E8283F 0%,#F5F2EC 60%);-webkit-background-clip:text;background-clip:text;color:transparent}
.lema{font-family:'Bricolage Grotesque';font-weight:800;font-size:74px;letter-spacing:-.01em;margin-top:22px}
.lema .c{color:#D8A63B}.lema .r{color:#3DDC7A}.lema .f{color:#FF4757}.lema .s{color:rgba(245,242,236,.58);font-size:.55em;margin:0 6px}
.linea{width:120px;height:4px;border-radius:4px;background:#E8283F;margin:54px 0 46px}
.t{font-family:'Bricolage Grotesque';font-weight:800;font-size:92px;line-height:1.02;letter-spacing:-.01em}
.t em{font-style:normal;color:#E8283F}
.sub{font-size:46px;color:rgba(245,242,236,.62);margin-top:22px}
.sub b{color:#F5F2EC}
.chips{display:flex;gap:18px;margin-top:48px}
.chip{font-size:34px;font-weight:700;padding:16px 26px;border-radius:999px;background:#141416;border:2px solid rgba(245,242,236,.12)}
.res{margin-top:56px;width:820px;background:#141416;border:2px solid rgba(245,242,236,.12);border-radius:36px;padding:30px 34px;display:flex;align-items:center;justify-content:center;gap:40px;box-shadow:0 30px 80px rgba(0,0,0,.6),0 0 90px rgba(232,40,63,.12)}
.badge{font-family:'Bricolage Grotesque';font-weight:800;font-size:52px;color:#D8A63B;background:rgba(216,166,59,.16);padding:12px 30px;border-radius:999px;white-space:nowrap}
.nums{display:flex;gap:34px;text-align:left}
.nums b{display:block;font-family:'Bricolage Grotesque';font-size:52px;line-height:1}
.nums span{font-size:26px;color:rgba(245,242,236,.55)}
.nums .g{color:#3DDC7A}
.url{position:absolute;left:0;right:0;bottom:150px;text-align:center;font-size:38px;font-weight:700;color:rgba(245,242,236,.7)}
.url span{color:#E8283F}
</style></head><body>
<div class="marca">${PICA}</div>
<div class="col">
  <div class="pica">${PICA}</div>
  <div class="logo">RÍO</div>
  <div class="lema"><span class="c">CALL</span><span class="s">,</span> <span class="r">RAISE</span> <span class="s">o</span> <span class="f">FOLD</span></div>
  <div class="linea"></div>
  <div class="t">¿Jugaste bien<br>esa <em>mano</em>?</div>
  <div class="sub"><b>RÍO</b> te lo dice en segundos</div>
  <div class="chips"><div class="chip">📸 Captura</div><div class="chip">🎙️ Voz</div><div class="chip">✍️ Cartas</div></div>
  <div class="res"><div class="badge">🟡 PAGA</div><div class="nums"><div><b class="g">53%</b><span>Ganas</span></div><div><b>31%</b><span>Necesitas</span></div><div><b class="g">+6</b><span>fichas</span></div></div></div>
</div>
<div class="url">rio-poker<span>.</span>vercel.app</div>
</body></html>`;
(async () => {
  const f = path.join(SALIDA, 'portada.html'); fs.writeFileSync(f, html);
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  await p.route('**/*', r => fontRoute(r) || r.continue());
  await p.goto('file://' + f); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(200);
  const out = path.join(SALIDA, 'portada-que-es-rio.png'); await p.screenshot({ path: out });
  fs.rmSync(f); await b.close(); console.log(out);
})();
