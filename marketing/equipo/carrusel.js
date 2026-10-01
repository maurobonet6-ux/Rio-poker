// Carrusel para Instagram / Telegram: una imagen 1080×1350 por diapositiva, con el estilo de RÍO.
// La primera es el gancho; la última, la llamada a la acción con el enlace propio de la pieza.
//
//   node marketing/equipo/carrusel.js pieza.json carpeta-salida
//   (pieza = { id, hook, carrusel: { diapositivas: [{ titulo, texto }] }, cta })
const fs = require('fs'), path = require('path');
const { chromium } = require('@playwright/test');
const fontRoute = require('../videos/fonts.js');

const esc = (s) => String(s || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// **negrita** → resaltado en rojo de la marca.
const marcar = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');

const CSS = `
*{box-sizing:border-box;margin:0}
html,body{width:1080px;height:1350px;background:#0A0A0B;color:#F5F2EC;font-family:'Space Grotesk',sans-serif;overflow:hidden}
.s{position:relative;width:1080px;height:1350px;padding:110px 96px 120px;display:flex;flex-direction:column;justify-content:center;
  background:radial-gradient(900px 700px at 85% -10%,rgba(232,40,63,.28),transparent 60%),radial-gradient(700px 600px at -10% 110%,rgba(216,166,59,.12),transparent 60%),#0A0A0B}
.marca{position:absolute;top:70px;left:96px;font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:44px;letter-spacing:.01em}
.marca span{color:#E8283F}
.num{position:absolute;top:78px;right:96px;font-size:30px;color:rgba(245,242,236,.55);font-weight:600}
h1{font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:104px;line-height:1.02;letter-spacing:-.03em}
h2{font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:74px;line-height:1.06;letter-spacing:-.02em;margin-bottom:40px}
p{font-size:46px;line-height:1.38;color:rgba(245,242,236,.86)}
b{color:#FF4757;font-weight:700}
.raya{width:120px;height:10px;border-radius:6px;background:#E8283F;margin-bottom:48px}
.desliza{position:absolute;bottom:90px;left:96px;font-size:34px;color:rgba(245,242,236,.6)}
.cta{font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:84px;line-height:1.05;margin-bottom:44px}
.link{display:inline-block;margin-top:30px;padding:26px 40px;border-radius:999px;background:#E8283F;color:#fff;font-size:44px;font-weight:700}
.pie{position:absolute;bottom:70px;left:96px;right:96px;font-size:26px;color:rgba(245,242,236,.45)}`;

function paginas(p){
  const d = p.carrusel.diapositivas, total = d.length + 2;
  const marca = '<div class="marca">R<span>Í</span>O</div>';
  const out = [`<div class="s">${marca}<div class="num">1/${total}</div><div class="raya"></div><h1>${marcar(p.hook)}</h1><div class="desliza">Desliza →</div></div>`];
  d.forEach((s, i) => out.push(`<div class="s">${marca}<div class="num">${i + 2}/${total}</div>${s.titulo ? `<h2>${marcar(s.titulo)}</h2>` : ''}${s.texto ? `<p>${marcar(s.texto)}</p>` : ''}</div>`));
  out.push(`<div class="s">${marca}<div class="num">${total}/${total}</div><div class="cta">${marcar(p.cta || 'Analiza tu mano gratis en RÍO')}</div>
    <p>Por captura, por voz o a mano. RÍO te dice qué hacer y por qué.</p><div><span class="link">riopoker.es/v/${esc(p.id)}</span></div>
    <div class="pie">Juega con responsabilidad · +18</div></div>`);
  return out;
}

async function hacerCarrusel(pieza, carpeta){
  fs.mkdirSync(carpeta, { recursive: true });
  const b = await chromium.launch();
  const archivos = [];
  try {
    const page = await b.newPage({ viewport: { width: 1080, height: 1350 } });
    await page.route('**/*', r => fontRoute(r) || r.continue());
    const fuentes = '<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">';
    const lista = paginas(pieza);
    for (let i = 0; i < lista.length; i++){
      await page.setContent(`<!doctype html><html><head><meta charset="utf-8">${fuentes}<style>${CSS}</style></head><body>${lista[i]}</body></html>`);
      await page.evaluate(() => document.fonts.ready);
      const f = path.join(carpeta, `carrusel-${pieza.id}-${String(i + 1).padStart(2, '0')}.png`);
      await page.screenshot({ path: f });
      archivos.push(f);
    }
  } finally { await b.close(); }
  return archivos;
}

module.exports = { hacerCarrusel, paginas };

if (require.main === module){
  const [archivo, carpeta = 'salida'] = process.argv.slice(2);
  hacerCarrusel(JSON.parse(fs.readFileSync(archivo, 'utf8')), carpeta)
    .then(a => console.log(a.join('\n')))
    .catch(e => { console.error(e.message); process.exit(1); });
}
