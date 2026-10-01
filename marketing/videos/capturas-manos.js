// Analiza cada mano de manos.js con la web real de RÍO (en móvil) y guarda sus números y capturas.
// Uso: node capturas-manos.js [mano]
// Con SOLO_ANALISIS=1 se salta el paso a paso con capturas de cada carta (solo las necesita el vídeo «Qué es RÍO») y analiza
// directamente la mano completa: es mucho más rápido y da el mismo veredicto.
const { chromium } = require('@playwright/test');
const path = require('path');
const { RAIZ: ROOT, SALIDA, fontRoute } = require('./comun.js');
const { carta, ponerBote } = require(path.join(ROOT, 'tests', 'web', 'ayuda.js'));
const ORIGIN = 'http://rio.test';
const solo = process.argv[2];
const HANDS = Object.entries(require('./manos-lista.js').cargar()).filter(([n]) => !solo || n === solo).map(([n, m]) => ({ n, ...m.analisis }));
process.chdir(SALIDA);

async function abrir(b){
  const p = await b.newPage({ viewport:{width:400,height:860}, deviceScaleFactor:3, isMobile:true, hasTouch:true });
  await p.addInitScript(() => {
    if (sessionStorage.getItem('__i')) return; sessionStorage.setItem('__i','1');
    localStorage.setItem('rio_onboarded','true'); localStorage.setItem('rio_pro','true');
    localStorage.setItem('rio_token', JSON.stringify('c'.repeat(64)));
  });
  await p.route('**/*', (route) => {
    const url = new URL(route.request().url());
    if (url.hostname.includes('fonts.g')) return fontRoute(route) || route.fulfill({ status: 204, body: '' });
    if (url.origin !== ORIGIN) return route.fulfill({ status: 204, body: '' });
    if (url.pathname.startsWith('/_vercel/')) return route.fulfill({ status: 200, contentType: 'application/javascript', body: '' });
    if (url.pathname.startsWith('/api/')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ pro: true, used: 10, limit: 200, extra: 0 }) });
    const file = url.pathname.endsWith('/') ? url.pathname + 'index.html' : url.pathname;
    return route.fulfill({ path: path.join(ROOT, file) });
  });
  await p.goto(ORIGIN + '/app/');
  await p.evaluate(() => document.fonts.ready);
  await p.addStyleTag({ content: '*{transition:none!important;animation:none!important} .current-hand{display:none!important}' });
  return p;
}
async function poner(p, cards, nHole){
  if (!cards.length) return;
  await p.locator('#holeRow .cardslot').first().click();
  for (let i = 0; i < cards.length; i++){
    if (i === nHole) await p.locator('#flopRow .cardslot').first().click();
    if (i === nHole + 3) await p.locator('#turnRow .cardslot').first().click();
    if (i === nHole + 4) await p.locator('#riverRow .cardslot').first().click();
    await carta(p, cards[i]);
  }
  if (await p.locator('#overlay.show').isVisible()) await p.locator('#closePicker').click();
  await p.waitForTimeout(200);
}
(async () => {
  const b = await chromium.launch();
  for (const h of HANDS){
    const all = [...h.mano, ...h.mesa];
    for (let k = process.env.SOLO_ANALISIS === '1' ? all.length : 0; k <= all.length; k++){
      const p = await abrir(b);
      await poner(p, all.slice(0, k), 2);
      // Las capturas de las cartas y del bote solo las usa el vídeo «Qué es RÍO» (no hacen falta con SOLO_ANALISIS).
      if (process.env.SOLO_ANALISIS !== '1') await p.locator('#cardsPanel .mesa').screenshot({ path: `${h.n}-cards${k}.png` });
      if (k === all.length){
        await ponerBote(p, h.bote, h.pagar);
        await p.waitForTimeout(200);
        if (process.env.SOLO_ANALISIS !== '1') await p.locator('#cardsPanel .pot-fields').screenshot({ path: `${h.n}-bets.png` });
        await p.evaluate(() => document.getElementById('analyzeBtn').click());
        await p.locator('#resultPanel.show').waitFor();
        await p.waitForTimeout(600);
        await p.evaluate(() => {
          const r = document.getElementById('resultPanel');
          let hide = false;
          for (const el of r.children){ if (el.id === 'whyTitle') hide = true; if (hide) el.style.display = 'none'; }
          r.querySelector('.panel-head').style.display = 'none';
        });
        await p.locator('#resultPanel').screenshot({ path: `${h.n}-result.png` });
        const why = await p.evaluate(() => [...document.querySelectorAll('#whyList li')].map(li => li.textContent.replace(/\s+/g, ' ').trim()));
        require('fs').writeFileSync(`${h.n}-info.json`, JSON.stringify({ badge: (await p.locator('#decisionBadge').innerText()).trim(), why }, null, 1));
        console.log(h.n, (await p.locator('#decisionBadge').innerText()).trim());
      }
      await p.close();
    }
  }
  await b.close();
})();
