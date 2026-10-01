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

test('secciones', async ({ page }, info) => {
  const d = info.project.name;
  await preparar(page, 'facil');
  for (const [m, b, bote, pagar] of [[['As', '5s'], ['Ks', '8d', '3s'], 30, 10], [['7c', '2d'], ['Ah', 'Kd', 'Qh'], 40, 20], [['Qs', 'Qh'], [], 9, 4]]){
    await ponerMano(page, m, b); await ponerBote(page, bote, pagar); await analizar(page);
    const otro = m[0] === 'As' ? 'CALL' : 'FOLD';
    if (await page.locator(`#youDid [data-yd="${otro}"]`).count()) await page.locator(`#youDid [data-yd="${otro}"]`).click();
    await page.locator('#againBtn').click();
  }
  for (const v of ['practicar', 'aprender', 'progreso', 'historial', 'cuenta']){
    await page.goto('http://rio.test/app/#/' + v);
    await page.waitForTimeout(500);
    await foto(page, `${d}-vista-${v}`, false);
  }
});

test('partida y entrenamiento', async ({ page }, info) => {
  const d = info.project.name;
  await preparar(page, 'facil', { storage: { rio_pp_speed: 'rapida' } });
  await page.goto('http://rio.test/app/#/practicar');
  await page.locator('[data-pr="train"]').click();
  await page.waitForTimeout(600);
  await foto(page, `${d}-entreno`, false);
  await page.goto('http://rio.test/app/#/practicar'); await page.reload();
  await page.locator('[data-pr="partida"]').click();
  await page.waitForTimeout(1500);
  await foto(page, `${d}-partida`, false);
  await page.goto('http://rio.test/app/#/cuenta'); await page.reload();
  await page.waitForTimeout(400);
  await page.evaluate(() => document.getElementById('navPlan').click());
  await page.waitForTimeout(500);
  await foto(page, `${d}-planes`, false);
});
