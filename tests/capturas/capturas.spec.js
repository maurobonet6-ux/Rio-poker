// Capturas para revisar el diseño (no son pruebas: se lanzan a mano).
//   npx playwright test -c tests/capturas
// Las imágenes quedan en CAPTURAS (por defecto, tests/capturas/salida/).
const { test } = require('@playwright/test');
const path = require('path');
const { abrir, ponerMano, ponerBote, analizar } = require('../web/ayuda');
const fontRoute = require('../../marketing/videos/fonts.js');
const OUT = process.env.CAPTURAS || path.join(__dirname, 'salida');

async function preparar(page, modo, opts = {}){
  await abrir(page, { pro: true, ...opts, storage: { rio_mode: JSON.stringify(modo === 'pro' ? 'pro' : 'facil'), ...(opts.storage || {}) } });
  // Las fuentes de Google se sirven desde copias locales (después de abrir(), así esta ruta va primero) y se recarga.
  await page.route(/fonts\.(googleapis|gstatic)\.com/, r => fontRoute(r) || r.fulfill({ status: 204, body: '' }));
  await page.reload();
  await page.evaluate(() => document.fonts.ready);
}
const foto = (page, nombre, full = true) => page.screenshot({ path: path.join(OUT, `${nombre}.png`), fullPage: full });

for (const modo of ['facil', 'pro']){
  test(`analizar y resultado · ${modo}`, async ({ page }, info) => {
    const disp = info.project.name;
    await preparar(page, modo);
    await foto(page, `${disp}-${modo}-1-vacio`, false);
    await ponerMano(page, ['As', '5s'], ['Ks', '8d', '3s']);
    await ponerBote(page, 30, 10);
    await foto(page, `${disp}-${modo}-2-mano`, false);
    await foto(page, `${disp}-${modo}-2-mano-entera`);
    await analizar(page);
    await page.locator('#resultPanel').scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);
    await foto(page, `${disp}-${modo}-3-resultado`, false);
    await foto(page, `${disp}-${modo}-3-resultado-entero`);
  });
}

test('lista · facil', async ({ page }, info) => {
  await preparar(page, 'facil', { storage: { rio_entrada: 'lista' } });
  await ponerMano(page, ['As', '5s'], ['Ks', '8d', '3s']);
  await ponerBote(page, 30, 10);
  await foto(page, `${info.project.name}-lista-2-mano`, false);
});
