// Capturas de la web para el vídeo "Qué es RÍO".
const { chromium } = require('@playwright/test');
const path = require('path');
const { RAIZ: ROOT, SALIDA, fontRoute } = require('./comun.js');
const { carta, ponerBote } = require(path.join(ROOT, 'tests', 'web', 'ayuda.js'));
const ORIGIN = 'http://rio.test';
process.chdir(SALIDA);
async function abrir(b){
  const p = await b.newPage({ viewport:{width:400,height:860}, deviceScaleFactor:3, isMobile:true, hasTouch:true });
  await p.addInitScript(() => { if (sessionStorage.getItem('__i')) return; sessionStorage.setItem('__i','1');
    localStorage.setItem('rio_onboarded','true'); localStorage.setItem('rio_pro','true'); localStorage.setItem('rio_token', JSON.stringify('c'.repeat(64))); });
  await p.route('**/*', (route) => { const url = new URL(route.request().url());
    if (url.hostname.includes('fonts.g')) return fontRoute(route) || route.fulfill({ status: 204, body: '' });
    if (url.origin !== ORIGIN) return route.fulfill({ status: 204, body: '' });
    if (url.pathname.startsWith('/_vercel/')) return route.fulfill({ status: 200, contentType: 'application/javascript', body: '' });
    if (url.pathname.startsWith('/api/')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ pro: true, used: 10, limit: 200, extra: 0 }) });
    return route.fulfill({ path: path.join(ROOT, url.pathname.endsWith('/') ? url.pathname + 'index.html' : url.pathname) }); });
  await p.goto(ORIGIN + '/app/'); await p.evaluate(() => document.fonts.ready);
  await p.addStyleTag({ content: '*{transition:none!important;animation:none!important}' });
  return p;
}
(async () => {
  const b = await chromium.launch();
  // 1) Las 3 formas de meter la mano
  let p = await abrir(b);
  await p.evaluate(() => { const c = document.getElementById('cardsPanel'); let hide = false;
    for (const el of c.children){ if (el.classList.contains('table-grid')) hide = true; if (hide || el.id === 'currentHand') el.style.display = 'none'; } });
  await p.locator('#cardsPanel').screenshot({ path: 'x-entry.png' });
  // 2) Cuéntame tu mano
  await p.evaluate(() => document.getElementById('storyBtn').click());
  await p.fill('#storyText', 'Tengo as-rey en el botón. Flop reina, ocho, tres. Había 10 en el bote y el rival apuesta 8.');
  await p.locator('#helpModal .picker').screenshot({ path: 'x-story.png' });
  await p.close();
  // 3) Elegir cartas a mano (ventana de valores y de palos)
  p = await abrir(b);
  await p.locator('#holeRow .cardslot').first().click(); await p.waitForTimeout(200);
  await p.locator('#overlay .picker').screenshot({ path: 'x-pick1.png' });
  await p.locator('.rank-btn', { hasText: /^A$/ }).click(); await p.waitForTimeout(200);
  await p.locator('#overlay .picker').screenshot({ path: 'x-pick2.png' });
  await p.close();
  // 4) El porqué
  p = await abrir(b);
  await p.locator('#holeRow .cardslot').first().click();
  for (const c of ['Ah','Kd']) await carta(p, c);
  await p.locator('#flopRow .cardslot').first().click();
  for (const c of ['Qs','8c','3h']) await carta(p, c);
  if (await p.locator('#overlay.show').isVisible()) await p.locator('#closePicker').click();
  await ponerBote(p, 18, 8);
  await p.evaluate(() => document.getElementById('analyzeBtn').click());
  await p.locator('#resultPanel.show').waitFor(); await p.waitForTimeout(600);
  await p.evaluate(() => { const r = document.getElementById('resultPanel'); let hide = false;
    for (const el of r.children){ if (el.id === 'whyTitle') hide = true; el.dataset.d = el.style.display; if (hide) el.style.display = 'none'; }
    r.querySelector('.panel-head').style.display = 'none'; });
  await p.locator('#resultPanel').screenshot({ path: 'x-result.png' });
  require('fs').writeFileSync('x-info.json', JSON.stringify(await p.evaluate(() => [...document.querySelectorAll('#whyList li')].map(li => li.innerText))));
  await p.evaluate(() => { const r = document.getElementById('resultPanel'); let show = false;
    for (const el of r.children){ if (el.id === 'whyTitle') show = true; if (el.id === 'planBox') show = false; el.style.display = show ? '' : 'none'; }
    [...document.querySelectorAll('#whyList li')].forEach((li, i) => { if (i > 2) li.style.display = 'none'; }); });
  await p.locator('#resultPanel').screenshot({ path: 'x-why.png' });
  await b.close();
})();
