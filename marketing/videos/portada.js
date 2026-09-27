// Portada del vídeo «Qué es RÍO» (1080×1920). El texto va en la zona central 3:4, que es lo que se ve en la cuadrícula del perfil.
// Uso: node portada.js   (antes: capturas-web.js)
const { chromium } = require('@playwright/test');
const fs = require('fs'), path = require('path');
const { SALIDA, fontRoute } = require('./comun.js');
const src = f => 'file://' + path.join(SALIDA, f);
const html = `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,800&family=Space+Grotesk:wght@400;500;700&display=swap" rel="stylesheet"><style>
*{box-sizing:border-box;margin:0}
html,body{width:1080px;height:1920px;overflow:hidden}
body{background:radial-gradient(1000px 800px at 50% 20%, rgba(232,40,63,.35), transparent 60%), radial-gradient(900px 700px at 50% 95%, rgba(232,40,63,.14), transparent 65%), #0A0A0B;color:#F5F2EC;font-family:'Space Grotesk',sans-serif;
  display:flex;flex-direction:column;align-items:center;padding-top:300px}
.t{font-family:'Bricolage Grotesque';font-weight:800;font-size:108px;line-height:1.02;text-align:center;letter-spacing:-.01em}
.t em{font-style:normal;color:#E8283F}
.s{font-size:48px;color:rgba(245,242,236,.7);margin-top:26px;text-align:center}
.s b{color:#F5F2EC}
.phone{margin-top:60px;width:560px;border-radius:64px;background:#1c1c20;padding:12px;transform:rotate(-4deg);box-shadow:0 0 0 2px rgba(245,242,236,.14),0 40px 100px rgba(0,0,0,.8),0 0 140px rgba(232,40,63,.25)}
.scr{border-radius:52px;overflow:hidden;background:#0A0A0B;padding:70px 20px 30px;position:relative}
.scr:before{content:'';position:absolute;left:50%;top:18px;width:130px;height:30px;margin-left:-65px;border-radius:18px;background:#000}
.scr img{display:block;width:100%}
.logo{position:absolute;bottom:170px;font-family:'Bricolage Grotesque';font-weight:800;font-size:54px}
.logo span{color:#E8283F}
</style></head><body>
<div class="t">¿Jugaste bien<br>esa <em>mano</em>?</div>
<div class="s"><b>RÍO</b> te lo dice en segundos</div>
<div class="phone"><div class="scr"><img src="${src('x-result.png')}"></div></div>
<div class="logo">R<span>Í</span>O</div>
</body></html>`;
(async () => {
  const f = path.join(SALIDA, 'portada.html'); fs.writeFileSync(f, html);
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  await p.route('**/*', r => fontRoute(r) || r.continue());
  await p.goto('file://' + f); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(200);
  const out = path.join(SALIDA, 'portada-que-es-rio.png'); await p.screenshot({ path: out });
  fs.rmSync(f); await b.close(); console.log(out);
})();
