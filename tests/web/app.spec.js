// Pruebas de la web: lo importante que un usuario hace en RÍO.
const { test, expect } = require('@playwright/test');
const { abrir, carta, ponerMano, analizar, ORIGIN } = require('./ayuda');

test('la página carga sin errores y enseña cómo introducir la mano', async ({ page }) => {
  const { errores } = await abrir(page);
  await expect(page.locator('.entry-q')).toHaveText('¿Cómo quieres introducir tu mano?');
  await expect(page.locator('#uploadBox')).toBeVisible();
  await expect(page.locator('#manualBtn')).toBeVisible();
  expect(errores).toEqual([]);
});

test('bienvenida: explica RÍO y deja elegir modo con dos botones iguales', async ({ page }) => {
  await abrir(page, { bienvenida: true });
  await expect(page.locator('#helpModal.show')).toBeVisible();
  await expect(page.locator('.welcome-steps > div')).toHaveCount(3);
  const [a, b] = await page.locator('.welcome-choice').evaluateAll(els => els.map(e => { const r = e.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; }));
  expect(a).toEqual(b);
  await page.locator('.welcome-choice[data-welcome="pro"]').click();
  await expect(page.locator('body')).toHaveClass(/mode-pro/);
  await expect(page.locator('#helpModal.show')).toHaveCount(0);
});

test('elegir cartas: primero el valor, luego el palo, y las usadas se bloquean', async ({ page }) => {
  await abrir(page);
  await page.locator('#manualBtn').click();
  await expect(page.locator('#pickerTitle')).toContainText('Tu carta 1 de 2');
  await expect(page.locator('.rank-btn')).toHaveCount(13);
  await page.locator('.rank-btn', { hasText: /^A$/ }).click();
  await expect(page.locator('.suit-btn')).toHaveCount(4);
  await page.locator('.suit-btn', { hasText: 'Picas' }).click();
  await expect(page.locator('#pickerTitle')).toContainText('Tu carta 2 de 2');
  await page.locator('.rank-btn', { hasText: /^A$/ }).click();
  await expect(page.locator('.suit-btn', { hasText: 'Picas' })).toBeDisabled();
});

test('comunitarias: se ve en qué calle estás y no hace falta poner las 5', async ({ page }) => {
  await abrir(page);
  await ponerMano(page, ['Ah', 'Kd'], ['Qs', '7c', '3h']);
  await expect(page.locator('#streetNow')).toHaveText('Flop');
  await expect(page.locator('#boardHint')).toContainText('No hace falta poner el turn ni el river');
  await expect(page.locator('#overlay.show')).toHaveCount(0); // no salta solo al turn
});

test('modo Fácil: los detalles avanzados empiezan plegados', async ({ page }) => {
  await abrir(page);
  await expect(page.locator('#heroPosInput')).toBeVisible();
  await expect(page.locator('#seqBox')).toBeHidden();
  await expect(page.locator('#rangeChips')).toBeHidden();
  await page.locator('#moreToggle').click();
  await expect(page.locator('#seqBox')).toBeVisible();
  await expect(page.locator('#rangeChips')).toBeVisible();
});

test('consejos conocidos antes del flop', async ({ page }) => {
  await abrir(page, { pro: true });
  // Abrir desde UTG sin subidas: tabla de apertura.
  await page.selectOption('#heroPosInput', 'UTG');
  await ponerMano(page, ['7s', '2h']);
  await page.fill('#potInput', '3'); await page.fill('#callInput', '2');
  expect(await analizar(page)).toContain('TIRA');
  await page.locator('#resetBtn').click();
  await page.selectOption('#heroPosInput', 'UTG');
  await ponerMano(page, ['As', 'Ks']);
  await page.fill('#potInput', '3'); await page.fill('#callInput', '2');
  expect(await analizar(page)).toContain('SUBE');
  // Contra una subida: 7-2 se tira (antes decía SUBE) y AA resube.
  await page.locator('#resetBtn').click();
  await ponerMano(page, ['7s', '2h']);
  await page.fill('#potInput', '9'); await page.fill('#callInput', '4');
  expect(await analizar(page)).toContain('TIRA');
  await page.locator('#resetBtn').click();
  await ponerMano(page, ['As', 'Ah']);
  await page.fill('#potInput', '9'); await page.fill('#callInput', '4');
  expect(await analizar(page)).toContain('SUBE');
});

test('resultado: decisión, resumen, por qué, análisis completo y qué pasa si', async ({ page }) => {
  await abrir(page, { pro: true });
  await ponerMano(page, ['Ah', 'Kh'], ['Kd', '7c', '2s']);
  await page.fill('#potInput', '24'); await page.fill('#callInput', '8');
  await analizar(page);
  await expect(page.locator('#verdictLine')).toContainText('RÍO recomienda');
  await expect(page.locator('#keyLine .kchip').first()).toBeVisible();
  expect(await page.locator('#whyList li').count()).toBeGreaterThanOrEqual(3);
  await expect(page.locator('#fullAnalysis')).not.toHaveAttribute('open', '');
  await expect(page.locator('#whatIfRow .wi-cell')).toHaveCount(5);
  await expect(page.locator('#whatIfRow b').last()).not.toHaveText('…');
});

test('mano de ejemplo: se carga, se analiza y no gasta el análisis de prueba', async ({ page }) => {
  const { llamadas } = await abrir(page);
  await expect(page.locator('#demoCard')).toBeHidden(); // el panel empieza cerrado
  await page.locator('#demoPanel summary').click();
  await expect(page.locator('#demoCard')).toBeVisible();
  await expect(page.locator('#demoDec .decision-badge')).toContainText('PAGA');
  await page.locator('#demoLoadBtn').click();
  await analizar(page);
  await expect(page.locator('#demoNext')).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('rio_anon_used'))).toBeNull();
  expect(llamadas).not.toContain('free-use');
  await page.locator('#demoOwnBtn').click();
  await expect(page.locator('#holeRow .cardslot.empty')).toHaveCount(2);
});

test('el ejemplo solo aparece en modo Fácil', async ({ page }) => {
  await abrir(page);
  await expect(page.locator('#demoPanel')).toBeVisible();
  await page.locator('.mode-switch [data-mode="pro"]').click();
  await expect(page.locator('#demoPanel')).toBeHidden();
});

test('sin cuenta: 1 análisis de prueba y después pide crear la cuenta gratis', async ({ page }) => {
  await abrir(page);
  await ponerMano(page, ['Qs', 'Qh']);
  await page.fill('#potInput', '9'); await page.fill('#callInput', '4');
  await analizar(page);
  await expect(page.locator('#trialNudge')).toBeVisible();
  await page.locator('#resetBtn').click();
  await ponerMano(page, ['Js', 'Jh']);
  await page.fill('#potInput', '9'); await page.fill('#callInput', '4');
  await page.locator('#analyzeBtn').click();
  await expect(page.locator('#paywall.show')).toBeVisible();
  await expect(page.locator('#paywallTitle')).toHaveText('Crea tu cuenta gratis');
  await expect(page.locator('#paywall .paywall-price')).toBeHidden(); // sin precios: no parece un pago
});

test('secuencia de apuestas: repasa tus decisiones calle a calle', async ({ page }) => {
  await abrir(page, { pro: true, storage: { rio_mode: JSON.stringify('pro'), rio_bets_full: '1' } });
  const act = async (who, a, amt) => {
    await page.locator(`#seqControls [data-who="${who}"]`).click();
    await page.locator(`#seqControls [data-act="${a}"]`).click();
    if (amt){ await page.fill('#seqAmount', String(amt)); await page.locator('#seqAmountOk').click(); }
  };
  await page.selectOption('#heroPosInput', 'BTN'); await page.selectOption('#villPosInput', 'BB');
  await ponerMano(page, ['As', 'Qd'], ['Qh', '7c', '3s']);
  await page.locator('#seqBox summary').click();
  await page.locator('#seqTabs [data-s="0"]').click();
  await act('hero', 'raise', 5); await act('vill', 'call');
  await page.locator('#seqTabs [data-s="1"]').click();
  await act('vill', 'check'); await act('hero', 'bet', 6); await act('vill', 'raise', 20);
  await expect(page.locator('#potInput')).toHaveValue(/\d/);
  await analizar(page);
  await expect(page.locator('#timeline .tl-row')).toHaveCount(2);
  await expect(page.locator('#streetTrack .cur')).toHaveText('Flop');
});

test('compartir: el enlace abre la misma mano sin gastar análisis', async ({ page, browser }) => {
  await abrir(page, { pro: true });
  await ponerMano(page, ['Qs', 'Qh'], ['Kh', '8c', '4s']);
  await page.fill('#potInput', '18'); await page.fill('#callInput', '7');
  const decision = await analizar(page);
  const enlace = await page.evaluate(() => { const m = document.querySelector('#shareBtn'); return m ? location.origin : ''; });
  expect(enlace).toBe(ORIGIN);
  await page.locator('#shareBtn').click();
  const wa = await page.locator('.share-wa').getAttribute('href');
  const url = decodeURIComponent(wa).match(/http:\/\/rio\.test\/#m=[\w-]+/)[0];
  const amigo = await browser.newPage();
  const { llamadas } = await abrir(amigo, { path: url.replace(ORIGIN, '') });
  await expect(amigo.locator('#sharedBanner')).toBeVisible();
  await expect(amigo.locator('#resultPanel.show')).toBeVisible();
  expect((await amigo.locator('#decisionBadge').innerText()).trim().slice(-4)).toBe(decision.slice(-4));
  expect(llamadas).not.toContain('free-use');
  await amigo.close();
});

test('historial: guarda la mano con posición, tipo de partida y patrones (PRO)', async ({ page }) => {
  await abrir(page, { pro: true });
  await page.selectOption('#heroPosInput', 'CO');
  await ponerMano(page, ['Ts', '9s'], ['8s', '7d', '2c']);
  await page.fill('#potInput', '20'); await page.fill('#callInput', '10');
  await analizar(page);
  await expect(page.locator('#historyPanel')).toBeVisible();
  await expect(page.locator('#historyList .history-item').first()).toContainText('CO vs BB · Cash');
  await expect(page.locator('#histPatternsBody')).toContainText('manos analizadas');
});

test('tu progreso, planes y botón de administración', async ({ page }) => {
  await abrir(page, { pro: true });
  await expect(page.locator('#navInbox')).toHaveCount(0); // un cliente no ve nada de administración
  await page.evaluate(() => document.getElementById('navPlan').click());
  await expect(page.locator('#planPanel')).toContainText('Créditos de IA: 200 al mes');
  await expect(page.locator('#planPackList')).toContainText('2,99 €');
  await expect(page.locator('.app-version').first()).toHaveText(/^v\d+\.\d+$/);
});

test('el administrador sí ve sus avisos', async ({ page }) => {
  await abrir(page, { pro: true, admin: true, storage: { rio_admin: true, rio_email: 'admin@rio.test' } });
  await expect(page.locator('#navInbox')).toHaveCount(1);
});

test('en el móvil nada se sale de la pantalla', async ({ page }, info) => {
  test.skip(info.project.name !== 'movil', 'solo en móvil');
  await abrir(page, { pro: true });
  await ponerMano(page, ['Ah', 'Kh'], ['Kd', '7c', '2s']);
  await page.fill('#potInput', '24'); await page.fill('#callInput', '8');
  await analizar(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
});

test('captura: la IA (simulada) rellena la mano y se analiza sola', async ({ page }) => {
  await abrir(page, { pro: true, api: { 'analyze-table': { hand: 'Ah Kh', board: 'Kd 7c 2h', pot: 24, call: 8, heroPos: 'BTN', villPos: 'BB', numRivals: 1 } } });
  await page.setInputFiles('#screenshotInput', require('path').join(__dirname, '..', '..', 'og-image.png'));
  await page.locator('#resultPanel.show').waitFor();
  await expect(page.locator('#screenshotStatus')).toContainText('leída de la captura');
  await expect(page.locator('#resultHandName')).toContainText('Pareja de Reyes');
});

test('pagar: el enlace de Stripe lleva el email de tu cuenta', async ({ page }) => {
  await abrir(page, { logged: true, storage: { rio_email: JSON.stringify('jugador@rio.test') } });
  await page.evaluate(() => { window.__abiertos = []; window.open = (u) => { window.__abiertos.push(u); }; });
  await page.evaluate(() => document.getElementById('navPlan').click());
  await page.locator('#subscribeFromPlanBtn').click();
  const urls = await page.evaluate(() => window.__abiertos);
  expect(urls[0]).toMatch(/^https:\/\/buy\.stripe\.com\/.+\?prefilled_email=jugador%40rio\.test$/);
});

test('plan anual: 79,99 €/año, con el email de tu cuenta, y oculto si ya eres PRO', async ({ page, browser }) => {
  await abrir(page, { logged: true, storage: { rio_email: JSON.stringify('jugador@rio.test') } });
  await page.evaluate(() => { window.__abiertos = []; window.open = (u) => { window.__abiertos.push(u); }; });
  await page.evaluate(() => document.getElementById('navPlan').click());
  const anual = page.locator('#proPlanCard .annual-btn');
  await expect(anual).toContainText('79,99 €/año');
  await expect(page.locator('#proPlanCard .annual-note')).toContainText('79,99 €/año');
  await anual.click();
  expect((await page.evaluate(() => window.__abiertos))[0]).toBe('https://buy.stripe.com/7sY8wR3Vl3g0dOB7Ko9IQ06?prefilled_email=jugador%40rio.test');
  const pro = await browser.newPage();
  await abrir(pro, { pro: true });
  await pro.evaluate(() => document.getElementById('navPlan').click());
  await expect(pro.locator('#proPlanCard .annual-btn')).toBeHidden();
  await pro.close();
});
