// Pruebas de la web: lo importante que un usuario hace en RÍO.
const { test, expect } = require('@playwright/test');
const { abrir, carta, ponerMano, ponerBote, analizar, ponerPosiciones, abrirDetalles, cerrarDetalles, abrirPartida, ORIGIN } = require('./ayuda');

test('la página carga sin errores y enseña cómo introducir la mano', async ({ page }) => {
  const { errores } = await abrir(page);
  await expect(page.locator('#cardsPanel h2')).toHaveText('Tu mano');
  await expect(page.locator('#uploadBox')).toBeVisible();          // rellenar con captura, voz o historial
  await expect(page.locator('#storyBtn')).toBeVisible();
  await expect(page.locator('#importBtn')).toBeVisible();
  await expect(page.locator('#holeRow .cardslot')).toHaveCount(2); // o a mano, tocando los huecos de la mesa
  await expect(page.locator('#mesaSeats [data-seat]')).toHaveCount(6);
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
  await page.locator('#holeRow .cardslot').first().click();
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

test('los detalles avanzados empiezan plegados en una hoja aparte (también en Avanzado)', async ({ page }) => {
  await abrir(page);
  await expect(page.locator('#detailsSheet')).toBeHidden();
  await expect(page.locator('#seqBox')).toBeHidden();
  await expect(page.locator('#rangeChips')).toBeHidden();
  await abrirDetalles(page);
  await expect(page.locator('#heroPosInput')).toBeVisible();
  await expect(page.locator('#seqBox')).toBeVisible();
  await expect(page.locator('#rangeChips')).toBeVisible();
  await cerrarDetalles(page);
  // Los asientos de la mesa cambian las mismas posiciones
  await ponerPosiciones(page, 'CO', 'SB');
  await expect(page.locator('#heroPosInput')).toHaveValue('CO');
  await expect(page.locator('#villPosInput')).toHaveValue('SB');
  await expect(page.locator('#detailsSummary')).toContainText('CO vs SB');
  await ponerPosiciones(page, 'SB'); // tu sitio donde estaba el rival: se intercambian
  await expect(page.locator('#heroPosInput')).toHaveValue('SB');
  await expect(page.locator('#villPosInput')).toHaveValue('CO');
  await page.locator('[data-mode="pro"]').click();
  await expect(page.locator('#rangeGrid')).toBeHidden();
});

test('consejos conocidos antes del flop', async ({ page }) => {
  await abrir(page, { pro: true });
  // Abrir desde UTG sin subidas: tabla de apertura.
  await ponerPosiciones(page, 'UTG');
  await ponerMano(page, ['7s', '2h']);
  await ponerBote(page, 3, 2);
  expect(await analizar(page)).toContain('TIRA');
  await page.locator('#resetBtn').click();
  await ponerPosiciones(page, 'UTG');
  await ponerMano(page, ['As', 'Ks']);
  await ponerBote(page, 3, 2);
  expect(await analizar(page)).toContain('SUBE');
  // Contra una subida: 7-2 se tira (antes decía SUBE) y AA resube.
  await page.locator('#resetBtn').click();
  await ponerMano(page, ['7s', '2h']);
  await ponerBote(page, 9, 4);
  expect(await analizar(page)).toContain('TIRA');
  await page.locator('#resetBtn').click();
  await ponerMano(page, ['As', 'Ah']);
  await ponerBote(page, 9, 4);
  expect(await analizar(page)).toContain('SUBE');
});

test('resultado: decisión, resumen, por qué, análisis completo y qué pasa si', async ({ page }) => {
  await abrir(page, { pro: true });
  await ponerMano(page, ['Ah', 'Kh'], ['Kd', '7c', '2s']);
  await ponerBote(page, 24, 8);
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
  if (page.viewportSize().width < 1100){ // en el móvil el panel empieza cerrado; en ordenador ya está abierto a la derecha
    await expect(page.locator('#demoCard')).toBeHidden();
    await page.locator('#demoPanel summary').click();
  }
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

test('el ejemplo: en el móvil solo en modo Fácil; en ordenador también en Avanzado (columna derecha)', async ({ page }) => {
  await abrir(page);
  await expect(page.locator('#demoPanel')).toBeVisible();
  await page.locator('.mode-switch [data-mode="pro"]').click();
  if (page.viewportSize().width < 1100) await expect(page.locator('#demoPanel')).toBeHidden();
  else await expect(page.locator('#demoPanel')).toBeVisible();
});

test('ordenador: la mano a la izquierda y el resultado a la derecha; móvil: una columna', async ({ page }) => {
  await abrir(page);
  const caja = async (sel) => page.locator(sel).boundingBox();
  const cartas = await caja('#cardsPanel');
  if (page.viewportSize().width >= 1100){
    const vacio = await caja('#resultEmpty');
    expect(vacio.x).toBeGreaterThan(cartas.x + cartas.width - 1);    // al lado
    expect(Math.abs(vacio.y - cartas.y)).toBeLessThan(5);            // a la misma altura
    await ponerMano(page, ['Qs', 'Qh']);
    await ponerBote(page, 9, 4);
    await analizar(page);
    await expect(page.locator('#resultEmpty')).toBeHidden();         // el resultado ocupa su sitio
    const res = await caja('#resultPanel');
    expect(res.x).toBeGreaterThan(cartas.x + cartas.width - 1);
  } else {
    await expect(page.locator('#resultEmpty')).toBeHidden();
    await ponerMano(page, ['Qs', 'Qh']);
    await ponerBote(page, 9, 4);
    await analizar(page);
    const [c, r] = await page.evaluate(() => ['#cardsPanel', '#resultPanel'].map(sel => { const b = document.querySelector(sel).getBoundingClientRect(); return { x: b.x, top: b.top + scrollY, bottom: b.bottom + scrollY }; }));
    expect(Math.abs(r.x - c.x)).toBeLessThan(5);
    expect(r.top).toBeGreaterThan(c.bottom - 1);                     // uno debajo de otro
  }
});

test('sin cuenta: 1 análisis de prueba y después pide crear la cuenta gratis', async ({ page }) => {
  await abrir(page);
  await ponerMano(page, ['Qs', 'Qh']);
  await ponerBote(page, 9, 4);
  await analizar(page);
  await expect(page.locator('#trialNudge')).toBeVisible();
  await expect(page.locator('#trialNudge')).toContainText('10 análisis más');
  await page.locator('#resetBtn').click();
  await ponerMano(page, ['Js', 'Jh']);
  await ponerBote(page, 9, 4);
  await page.locator('#analyzeBtn').click();
  await expect(page.locator('#paywall.show')).toBeVisible();
  await expect(page.locator('#paywallTitle')).toHaveText('Crea tu cuenta gratis');
  await expect(page.locator('#paywall .paywall-price:visible')).toHaveCount(0); // sin precios: no parece un pago
});

test('secuencia de apuestas: repasa tus decisiones calle a calle', async ({ page }) => {
  await abrir(page, { pro: true, storage: { rio_mode: JSON.stringify('pro'), rio_bets_full: '1' } });
  const act = async (who, a, amt) => {
    await page.locator(`#seqControls [data-who="${who}"]`).click();
    await page.locator(`#seqControls [data-act="${a}"]`).click();
    if (amt){ await page.fill('#seqAmount', String(amt)); await page.locator('#seqAmountOk').click(); }
  };
  await ponerPosiciones(page, 'BTN', 'BB');
  await ponerMano(page, ['As', 'Qd'], ['Qh', '7c', '3s']);
  await abrirDetalles(page);
  await page.locator('#seqBox summary').click();
  await page.locator('#seqTabs [data-s="0"]').click();
  await act('hero', 'raise', 5); await act('vill', 'call');
  await page.locator('#seqTabs [data-s="1"]').click();
  await act('vill', 'check'); await act('hero', 'bet', 6); await act('vill', 'raise', 20);
  await expect(page.locator('#potInput')).toHaveValue(/\d/);
  await cerrarDetalles(page);
  await analizar(page);
  await expect(page.locator('#timeline .tl-row')).toHaveCount(2);
  await expect(page.locator('#streetTrack .cur')).toHaveText('Flop');
});

test('compartir: el enlace abre la misma mano sin gastar análisis', async ({ page, browser }) => {
  await abrir(page, { pro: true });
  await ponerMano(page, ['Qs', 'Qh'], ['Kh', '8c', '4s']);
  await ponerBote(page, 18, 7);
  const decision = await analizar(page);
  const enlace = await page.evaluate(() => { const m = document.querySelector('#shareBtn'); return m ? location.origin : ''; });
  expect(enlace).toBe(ORIGIN);
  await page.locator('#shareBtn').click();
  const wa = await page.locator('.share-wa').getAttribute('href');
  const url = decodeURIComponent(wa).match(/http:\/\/rio\.test\/app\/#m=[\w-]+/)[0];
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
  await ponerPosiciones(page, 'CO');
  await ponerMano(page, ['Ts', '9s'], ['8s', '7d', '2c']);
  await ponerBote(page, 20, 10);
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

test('estadísticas: el administrador ve su panel y sus visitas no cuentan', async ({ page }) => {
  const dias = Array.from({ length: 14 }, (_, i) => ({ dia: new Date(Date.now() - i * 864e5).toISOString().slice(0, 10), cuentas: i ? 0 : 2, analisis: i ? 1 : 7, pago: 0, pro: i ? 0 : 1, packs: 0 }));
  await abrir(page, { pro: true, admin: true, storage: { rio_admin: true, rio_email: 'admin@rio.test' },
    api: { stats: { dias, porOrigen: { instagram: { cuentas: 2, pro: 1 } }, cuentasTotales: 5 } } });
  await page.waitForFunction(() => localStorage.getItem('rio_sin_estadisticas') === '1'); // el servidor dijo que es admin
  await expect(page.locator('#navAdminStats')).toHaveCount(1);
  await expect(page.locator('#navStats')).toHaveCount(1); // su propio progreso sigue ahí
  await page.evaluate(() => document.getElementById('navAdminStats').click());
  await expect(page.locator('#helpBody .stats-tbl').first()).toContainText('Total 14 días');
  await expect(page.locator('#helpBody .stats-tbl tr.tot')).toContainText('20'); // 7 + 13 manos
  await expect(page.locator('#helpBody')).toContainText('instagram');
  // Al volver a entrar, el contador de visitas de Vercel ya no se carga para el admin.
  await page.reload();
  expect(await page.evaluate(() => [...document.scripts].some(s => s.src.includes('/_vercel/insights')))).toBe(false);
});

test('estadísticas: "Estadísticas y errores" abre el progreso del jugador, no el panel de admin', async ({ page }) => {
  await abrir(page, { pro: true, storage: { rio_email: 'cliente@rio.test' } });
  await expect(page.locator('#navAdminStats')).toHaveCount(0);
  await page.evaluate(() => document.getElementById('navStats').click());
  // "Mi progreso" es ahora una sección propia (#/progreso), no una ventana.
  await expect(page).toHaveURL(/#\/progreso$/);
  await expect(page.locator('#progressBody')).toContainText('Aún no hay datos');
  await expect(page.locator('#progressBody .stats-tbl')).toHaveCount(0);
});

test('estadísticas: se guarda de dónde llega la persona y se manda al crear la cuenta', async ({ page }) => {
  const { llamadas } = await abrir(page, { path: '/app/?utm_source=Instagram' });
  expect(await page.evaluate(() => localStorage.getItem('rio_src'))).toBe('instagram');
  expect(await page.evaluate(() => [...document.scripts].some(s => s.src.includes('/_vercel/insights')))).toBe(true);
  let cuerpo = null;
  await page.route('**/api/verify-code', (r) => { cuerpo = JSON.parse(r.request().postData()); r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ token: 'c'.repeat(64), email: 'nuevo@rio.test', pro: false }) }); });
  await page.evaluate(() => document.getElementById('navLogin').click());
  await expect(page.locator('#paywall.show')).toBeVisible();
  await page.fill('#proEmail', 'nuevo@rio.test');
  await page.locator('#restoreBtn').click();
  await page.fill('#proCode', '123456');
  await page.locator('#restoreBtn').click();
  await expect.poll(() => cuerpo && cuerpo.src).toBe('instagram');
  expect(llamadas).toContain('send-code');
});

test('en el móvil nada se sale de la pantalla', async ({ page }, info) => {
  test.skip(info.project.name !== 'movil', 'solo en móvil');
  await abrir(page, { pro: true });
  await ponerMano(page, ['Ah', 'Kh'], ['Kd', '7c', '2s']);
  await ponerBote(page, 24, 8);
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
  expect(urls[0]).toMatch(/^https:\/\/buy\.stripe\.com\/.+\?prefilled_email=jugador%40rio\.test&client_reference_id=rio_[\w-]+$/);
  // El identificador de la cuenta es el email en base64url (lo lee lib/stripe.js).
  const ref = urls[0].split('client_reference_id=')[1];
  expect(Buffer.from(ref.slice(4), 'base64url').toString()).toBe('jugador@rio.test');
});

test('plan anual: 79,99 €/año, con el email de tu cuenta, y oculto si ya eres PRO', async ({ page, browser }) => {
  await abrir(page, { logged: true, storage: { rio_email: JSON.stringify('jugador@rio.test') } });
  await page.evaluate(() => { window.__abiertos = []; window.open = (u) => { window.__abiertos.push(u); }; });
  await page.evaluate(() => document.getElementById('navPlan').click());
  // El plan anual es su propia tarjeta, no está dentro de la del mensual.
  await expect(page.locator('#proPlanCard .annual-btn')).toHaveCount(0);
  await expect(page.locator('#annualPlanCard')).toContainText('79,99 €');
  const anual = page.locator('#annualPlanCard .annual-btn');
  await expect(anual).toContainText('79,99 €/año');
  await anual.click();
  expect((await page.evaluate(() => window.__abiertos))[0]).toMatch(/^https:\/\/buy\.stripe\.com\/7sY8wR3Vl3g0dOB7Ko9IQ06\?prefilled_email=jugador%40rio\.test&client_reference_id=rio_/);
  const pro = await browser.newPage();
  await abrir(pro, { pro: true });
  await pro.evaluate(() => document.getElementById('navPlan').click());
  await expect(pro.locator('#annualPlanCard')).toBeHidden();
  await pro.close();
});

test('"Ya he pagado, comprobar" activa PRO si el servidor ya ve el pago', async ({ page }) => {
  let pagado = false;
  await abrir(page, { logged: true, storage: { rio_email: JSON.stringify('jugador@rio.test') } });
  await page.route('**/api/check-pro*', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ pro: pagado, email: 'jugador@rio.test' }) }));
  await page.evaluate(() => document.getElementById('navPlan').click());
  const boton = page.locator('#proPlanCard .paid-check');
  await boton.click();
  await expect(page.locator('#proPlanCard .paid-msg')).toContainText('Aún no vemos tu pago');
  pagado = true;
  await boton.click();
  await expect(page.locator('#proPlanCard .paid-msg')).toContainText('Ya eres RÍO PRO');
  expect(await page.evaluate(() => localStorage.getItem('rio_pro'))).toBe('true');
});

test('modo Fácil: pasos con guía y bote en dos preguntas', async ({ page }) => {
  await abrir(page);
  await expect(page.locator('#stepTodo')).toContainText('elige tus dos cartas');
  await expect(page.locator('.steps-nav')).toBeHidden();      // sin la barra de calles de arriba
  await ponerMano(page, ['As', 'Ks']);
  await expect(page.locator('#stepTodo')).toContainText('Toca tu asiento');
  await ponerPosiciones(page, 'BTN');
  await page.fill('#potBeforeInput', '30'); await page.fill('#betInput', '10');
  await expect(page.locator('#easyPotSum')).toContainText('Bote 40 · te toca pagar 10');
  await expect(page.locator('#potInput')).toHaveValue('40');
  await expect(page.locator('#callInput')).toHaveValue('10');
  await expect(page.locator('#stepTodo')).toContainText('¡Listo!');
  await page.locator('#noBetBtn').click();
  await expect(page.locator('#callInput')).toHaveValue('0');
  await expect(page.locator('#easyPotSum')).toContainText('Nadie ha apostado');
});

test('detalles avanzados: cómo juega, rivales y tipo de partida, por ese orden', async ({ page }) => {
  await abrir(page);
  await abrirDetalles(page);
  const [posiciones, comoJuega, rivales, partida] = await page.evaluate(() => ['#heroPosInput', '#rangeChips', '#rivMinus', '#gameType']
    .map(s => document.querySelector(s).closest('.field').getBoundingClientRect().top));
  expect(posiciones).toBeLessThan(comoJuega);
  expect(comoJuega).toBeLessThan(rivales);
  expect(rivales).toBeLessThanOrEqual(partida);
});

test('resultado: "Analizar otra mano" va antes que compartir y copiar', async ({ page }) => {
  await abrir(page, { pro: true });
  await ponerMano(page, ['Qs', 'Qh']);
  await ponerBote(page, 9, 4);
  await analizar(page);
  const [otra, compartir] = await page.evaluate(() => ['#againBtn', '#shareBtn'].map(s => document.querySelector(s).getBoundingClientRect().top));
  expect(otra).toBeLessThan(compartir);
  await expect(page.locator('#againBtn')).toHaveClass(/btn-primary/);
});

test('pagar sin haber entrado: primero pide entrar o crear la cuenta', async ({ page }) => {
  await abrir(page);
  await page.evaluate(() => { window.__abiertos = []; window.open = (u) => { window.__abiertos.push(u); }; });
  await page.evaluate(() => document.getElementById('navPlan').click());
  await page.locator('#subscribeFromPlanBtn').click();
  await expect(page.locator('#paywall.show')).toBeVisible();
  await expect(page.locator('#paywallTitle')).toHaveText('Primero, entra en tu cuenta');
  expect(await page.evaluate(() => window.__abiertos.length)).toBe(0); // no se abre Stripe sin cuenta
});

test('estadísticas: una guía también guarda de dónde llega la persona (y no pisa un origen anterior)', async ({ page }) => {
  await abrir(page, { path: '/guias/como-calcular-pot-odds/?utm_source=pokerred' });
  expect(await page.evaluate(() => localStorage.getItem('rio_src'))).toBe('pokerred');
  await page.goto('http://rio.test/manos/aks/?utm_source=otra');
  expect(await page.evaluate(() => localStorage.getItem('rio_src'))).toBe('pokerred');
});

test('móvil: rellenar con captura, voz o historial en una fila y tus cartas se ven sin bajar', async ({ page }) => {
  test.skip(page.viewportSize().width > 680, 'solo en el móvil');
  await abrir(page);
  const y = async (sel) => (await page.locator(sel).boundingBox()).y;
  const fila = await y('#uploadBox');
  expect(Math.abs(await y('#storyBtn') - fila)).toBeLessThan(3);
  expect(Math.abs(await y('#importBtn') - fila)).toBeLessThan(3);
  await expect(page.locator('#holeRow')).toBeInViewport();
});

test('ejemplo: "Ver el análisis completo" enseña el resultado entero sin gastar análisis', async ({ page }) => {
  await abrir(page);
  if (page.viewportSize().width < 1100) await page.locator('#demoPanel summary').click();
  await page.locator('#demoLoadBtn').click();
  await expect(page.locator('#resultPanel.show')).toBeVisible();
  await expect(page.locator('#demoNext')).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('rio_anon_used'))).toBeNull();
});

test('dentro de Instagram sale el aviso para abrir RÍO en el navegador; se puede cerrar', async ({ browser }) => {
  const ctx = await browser.newContext({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 300.0.0', serviceWorkers: 'block' });
  const page = await ctx.newPage();
  await abrir(page);
  await expect(page.locator('#inappBar')).toBeVisible();
  await expect(page.locator('#inappTxt')).toContainText('Instagram');
  await page.locator('#inappClose').click();
  await expect(page.locator('#inappBar')).toBeHidden();
  await page.reload();
  await expect(page.locator('#inappBar')).toBeHidden(); // no vuelve a salir
  await ctx.close();
});

test('en un navegador normal no sale el aviso de Instagram/TikTok', async ({ page }) => {
  await abrir(page);
  await expect(page.locator('#inappBar')).toBeHidden();
});

test('sin datos en la página pero con la cookie de sesión: recupera la sesión sin pedir el código', async ({ page }) => {
  const { llamadas } = await abrir(page, { api: { session: { token: 'd'.repeat(64), email: 'yo@rio.test' } } });
  await expect.poll(() => page.evaluate(() => localStorage.getItem('rio_email'))).toBe('"yo@rio.test"');
  expect(llamadas).toContain('session');
  await expect.poll(() => llamadas.includes('check-pro')).toBe(true); // después comprueba la cuenta como siempre
});

test('partida de práctica: mesa de 6 a pantalla completa, manos completas y repaso de decisiones', async ({ page }) => {
  test.setTimeout(150_000);
  await abrir(page, { storage: { rio_pp_speed: 'rapida' } });
  await abrirPartida(page);
  await expect(page.locator('#gameView')).toBeVisible();
  await expect(page.locator('.g-seat')).toHaveCount(6);
  await expect(page.locator('.g-seat.hero .g-card:not(.g-back)')).toHaveCount(2);   // tus cartas, boca arriba
  expect(page.url()).toContain('#partida');
  const cuadra = () => page.evaluate(() => Math.abs(window.RIO_PARTIDA._fichas() - window.RIO_PARTIDA._esperadas()) < 0.01);
  for (let mano = 0; mano < 5; mano++){
    const hasta = Date.now() + 60_000;
    for (let paso = 0; Date.now() < hasta; paso++){
      if (await page.locator('#gNext').isVisible()) break;
      const acts = page.locator('.g-actions [data-act]:not([data-act="hint"])');
      if (await acts.count()){
        expect(await cuadra()).toBe(true);                       // en mitad de la mano tampoco se pierden fichas
        const n = await acts.count();
        if (paso === 0 && mano === 1) await page.locator('[data-act="hint"]').click();   // la pista
        await acts.nth(mano % 2 ? Math.floor(Math.random() * n) : 1).click();
      } else await page.waitForTimeout(120);
    }
    await expect(page.locator('#gNext')).toBeVisible({ timeout: 30_000 });
    expect(await cuadra()).toBe(true);
    await page.locator('.g-tabs [data-tab="repaso"]').click();
    await expect(page.locator('#gPanel')).not.toBeEmpty();
    await page.locator('#gNext').click();
  }
  const st = await page.evaluate(() => JSON.parse(localStorage.getItem('rio_partidas')));
  expect(st.manos).toBe(5);
  await page.locator('.g-tabs [data-tab="sesion"]').click();
  await expect(page.locator('#gPanel')).toContainText('manos jugadas');
  await page.locator('#gClose').click();
  await expect(page.locator('#gameView')).toBeHidden();
  expect(page.url()).not.toContain('#partida');
});

test('partida de práctica: mano a mano, 3 jugadores y mesa variable (las fichas siempre cuadran)', async ({ page }) => {
  test.setTimeout(240_000);
  await abrir(page, { storage: { rio_pp_speed: 'rapida', rio_pp_jugadores: '2' } });
  await abrirPartida(page);
  await expect(page.locator('.g-seat')).toHaveCount(2);
  // Mano a mano, el botón pone la ciega pequeña
  await expect(page.locator('.g-seat', { has: page.locator('.g-dealer') }).locator('.g-bubble')).toHaveText(/Ciega 1|Sube|Paga|Tira|Pasa/);
  const cuadra = () => page.evaluate(() => Math.abs(window.RIO_PARTIDA._fichas() - window.RIO_PARTIDA._esperadas()) < 0.01);
  const jugarManos = async (n) => {
    for (let mano = 0; mano < n; mano++){
      const hasta = Date.now() + 60_000;
      while (Date.now() < hasta){
        if (await page.locator('#gNext').isVisible()) break;
        const acts = page.locator('.g-actions [data-act]:not([data-act="hint"])');
        const k = await acts.count();
        if (k){ expect(await cuadra()).toBe(true); await acts.nth(Math.floor(Math.random() * k)).click(); }
        else await page.waitForTimeout(100);
      }
      await expect(page.locator('#gNext')).toBeVisible({ timeout: 30_000 });
      expect(await cuadra()).toBe(true);
      await page.locator('#gNext').click();
    }
  };
  await jugarManos(4);
  await page.selectOption('#gPlayers', '3');                    // con una mano en juego, se aplica en la siguiente
  await expect(page.locator('#gPanel')).toContainText('Desde la próxima mano jugaréis 3');
  await jugarManos(1);
  await expect(page.locator('.g-seat')).toHaveCount(3);
  await jugarManos(3);
  await page.selectOption('#gPlayers', 'var');
  await jugarManos(8);
  const n = await page.locator('.g-seat').count();
  expect(n).toBeGreaterThanOrEqual(3); expect(n).toBeLessThanOrEqual(6);
});

test('¿Tú qué hiciste?: se guarda en el historial y en tus errores, y se puede cambiar', async ({ page }) => {
  await abrir(page, { pro: true });
  await ponerMano(page, ['7c', '2d'], ['As', 'Kd', 'Qh']);
  await ponerBote(page, 20, 20);
  await analizar(page);
  await expect(page.locator('#youDid')).toBeVisible();
  const rec = await page.evaluate(() => JSON.parse(localStorage.getItem('rio_history'))[0].decision);
  const otra = rec === 'CALL' ? 'FOLD' : 'CALL';
  await page.locator(`#youDid [data-yd="${otra}"]`).click();
  await expect(page.locator('#youDid .yd-cmp')).toContainText('Tú hiciste');
  let h = await page.evaluate(() => JSON.parse(localStorage.getItem('rio_history'))[0]);
  expect(h.act).toBe(otra);
  expect(['meh', 'bad']).toContain(h.g);
  const rows = await page.evaluate(() => Object.values(JSON.parse(localStorage.getItem('rio_reviews'))).flatMap(x => x.rows));
  expect(rows).toHaveLength(1);
  expect(rows[0].act).toBe(otra);
  await page.locator(`#youDid [data-yd="${rec}"]`).click();
  h = await page.evaluate(() => JSON.parse(localStorage.getItem('rio_history'))[0]);
  expect(h.g).toBe('ok');
  expect(await page.evaluate(() => Object.values(JSON.parse(localStorage.getItem('rio_reviews'))).flatMap(x => x.rows).length)).toBe(1);
});

test('Mi progreso: resume tus manos y tu mayor leak, y Atrás vuelve al analizador', async ({ page }) => {
  const t = Date.now();
  await abrir(page, { pro: true, storage: {
    rio_history: [{ hand: 'A♠ K♦', equity: '60.0', decision: 'CALL', cls: 'warn', t, st: 1, ev: 2.5, evU: 'BB', g: 'bad', act: 'FOLD', hp: 'BTN', vp: 'BB', game: 'cash' }],
    rio_reviews: { x: { t, rows: [{ s: 1, rec: 'CALL', act: 'FOLD', g: 'bad', pos: 'BTN vs BB', pt: '', bc: 0, loss: 2.5 }] } } } });
  await page.evaluate(() => document.getElementById('navStats').click());
  await expect(page.locator('#progressView')).toBeVisible();
  await expect(page.locator('.pv-kpi').first()).toContainText('1');
  await expect(page.locator('.pv-leak')).toContainText('Te retiras cuando convenía pagar');
  await expect(page.locator('#progressBody')).toContainText('−2,5 BB');
  await page.goBack();
  await expect(page.locator('#progressView')).toBeHidden();
  await page.goto('http://rio.test/app/#/progreso');
  await expect(page.locator('#progressView')).toBeVisible();
});

test('navegación: secciones con su dirección, pestaña activa y Atrás del navegador', async ({ page }) => {
  await abrir(page);
  const nav = page.locator('#appNav');
  await expect(nav.locator('.an-link.on')).toHaveText(/Analizar/);
  await nav.locator('[data-route="practicar"]').click();
  await expect(page).toHaveURL(/#\/practicar$/);
  await expect(page.locator('#practiceView')).toBeVisible();
  await expect(nav.locator('.an-link.on')).toHaveText(/Practicar/);
  await nav.locator('[data-route="cuenta"]').click();
  await expect(page.locator('#accountView')).toBeVisible();
  await expect(page.locator('#accountList')).toContainText('Configuración');
  await page.goBack();
  await expect(page.locator('#practiceView')).toBeVisible();
  await page.goBack();
  await expect(page.locator('#practiceView')).toBeHidden();
  await expect(page.locator('#cardsPanel')).toBeVisible();
});

test('navegación: el historial se ve en su sección y vuelve al analizador al salir', async ({ page }) => {
  await abrir(page, { storage: { rio_history: [{ hand: 'A♠ K♦', equity: '60.0', decision: 'CALL', cls: 'warn', t: Date.now(), st: 1 }] } });
  await page.goto('http://rio.test/app/#/historial');
  await expect(page.locator('#historyView #historyPanel')).toBeVisible();
  await page.goto('http://rio.test/app/#/');
  await expect(page.locator('#historyView #historyPanel')).toHaveCount(0);
  await expect(page.locator('.wrap #historyPanel')).toBeVisible();
});

test('historial interactivo: abrir una mano, ver su ficha y reanalizarla sin duplicarla', async ({ page }) => {
  await abrir(page, { pro: true });
  await ponerMano(page, ['Ah', '9h'], ['Kh', '7h', '2c']);
  await ponerBote(page, 30, 15);
  await analizar(page);
  await page.locator('#historyList .history-item').first().click();
  await expect(page.locator('#helpModal.show')).toBeVisible();
  await expect(page.locator('#helpBody .hh-cards .mini-card')).toHaveCount(5);
  await expect(page.locator('#helpBody')).toContainText('RÍO recomienda');
  await page.locator('#hhRe').click();
  await expect(page.locator('#helpModal.show')).toHaveCount(0);
  await expect(page.locator('#resultPanel')).toHaveClass(/show/);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('rio_history')).length)).toBe(1);
});

test('entrenamiento por temas: 3-bet pregunta si resubir y "mis errores" pide datos reales', async ({ page }) => {
  await abrir(page);
  await page.evaluate(() => document.getElementById('navTrain').click());
  await page.locator('[data-topic="3bet"]').click();
  await expect(page.locator('#helpBody')).toContainText('abre subiendo a');
  await expect(page.locator('[data-ans="RAISE"]')).toContainText('3-bet');
  await page.locator('[data-ans="CALL"]').click();
  await expect(page.locator('.train-verdict')).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('rio_train_log')).pop().k)).toBe('vsopen');
  await page.locator('[data-topic="errores"]').click();
  await expect(page.locator('#helpBody')).toContainText('Analiza más manos para desbloquear entrenamiento personalizado');
});

test('entrenar mis errores: con errores reales saca situaciones de ese tipo', async ({ page }) => {
  const rows = [1, 2, 3].map(i => ({ s: 3, rec: 'FOLD', act: 'CALL', g: 'bad', pos: 'BTN vs BB', pt: '', bc: 1, loss: 1 }));
  await abrir(page, { storage: { rio_reviews: { x: { t: Date.now(), rows } } } });
  await page.evaluate(() => document.getElementById('navTrain').click());
  await page.locator('[data-topic="errores"]').click();
  await expect(page.locator('#helpBody')).toContainText('river');
  await expect(page.locator('[data-ans="CALL"]')).toBeVisible();
});

test('landing pública: sin errores, con la mano de ejemplo real y llevando a la app', async ({ page }) => {
  const { errores } = await abrir(page, { path: '/' });
  await expect(page.locator('h1')).toContainText('Tu coach de póker');
  await expect(page.locator('.laptop .screen')).toContainText('Pagar 10'); // la mano de ejemplo con el resultado del motor
  await expect(page.locator('#precios')).toContainText('9,99 €');
  await expect(page.locator('a.btn', { hasText: 'Empezar gratis' }).first()).toHaveAttribute('href', '/app/');
  expect(errores).toEqual([]);
  expect(await page.locator('link[rel="canonical"]').getAttribute('href')).toBe('https://riopoker.es/');
});

test('portada: los enlaces viejos con #/… (y #m=…) abren la app en /app/ sin quedarse en la landing', async ({ page }) => {
  await abrir(page, { path: '/#/practicar' });
  await expect(page).toHaveURL('http://rio.test/app/#/practicar');
  await expect(page.locator('#practiceView')).toBeVisible();
});

test('portada: la atribución de la visita (utm_source) se guarda ya en la landing', async ({ page }) => {
  await abrir(page, { path: '/?utm_source=Instagram' });
  expect(await page.evaluate(() => localStorage.getItem('rio_src'))).toBe('instagram');
  await expect(page.locator('h1')).toContainText('Tu coach de póker'); // sigue siendo la landing
});

test('analítica: avisa de lo que hace el usuario con un identificador anónimo, sin email', async ({ page }) => {
  const eventos = [];
  page.on('request', (req) => { if (new URL(req.url()).pathname === '/api/track') eventos.push(JSON.parse(req.postData() || '{}')); });
  await abrir(page, { pro: true, storage: { rio_email: 'yo@rio.test' }, path: '/app/?utm_source=contenido&c=v42' });
  await ponerMano(page, ['7c', '2d'], ['As', 'Kd', 'Qh']);
  await ponerBote(page, 20, 20);
  await analizar(page);
  await page.locator('#youDid [data-yd="CALL"]').click();
  await page.goto('http://rio.test/app/#/progreso');
  await expect.poll(() => eventos.map(e => e.e)).toEqual(expect.arrayContaining(['app_open', 'analysis_started', 'analysis_completed', 'manual_analysis', 'user_action_recorded', 'progress_viewed']));
  const an = eventos.find(e => e.e === 'analysis_completed');
  expect(an.aid).toMatch(/^[a-z0-9]{8,32}$/);
  expect(an.c).toBe('v42'); // llegó por el contenido v42
  expect(an.p).toMatchObject({ via: 'manual', n: 1 });
  expect(eventos.find(e => e.e === 'user_action_recorded').p).toMatchObject({ act: 'CALL' });
  expect(JSON.stringify(eventos)).not.toContain('yo@rio.test');
  // Con ?sinestadisticas no se manda nada
  const antes = eventos.length;
  await page.goto('http://rio.test/app/?sinestadisticas=1');
  await page.goto('http://rio.test/app/#/progreso');
  await page.waitForTimeout(300);
  expect(eventos.length).toBe(antes);
});

test('administrador: ve el uso de RÍO (embudo, retención, errores) y la cola de contenidos, y aprueba una pieza', async ({ page }) => {
  const { errores } = await abrir(page, { pro: true, admin: true, storage: { rio_admin: true, rio_email: 'admin@rio.test' } });
  const hoy = new Date().toISOString().slice(0, 10);
  const embudo = [['app_open', 'Abrieron RÍO', 40], ['signup_completed', 'Crearon cuenta o entraron', 12], ['analysis_completed', 'Analizaron una mano', 10]].map(([evento, nombre, usuarios]) => ({ evento, nombre, usuarios }));
  const producto = { dias: [], embudo7: embudo, embudo30: embudo, usos7: { screenshot_analysis: 3 }, activos: { hoy: 5, semana: 40, mes: 90 },
    retencion: [{ dia: hoy, nuevos: 10, d1: 4 }], contenidos: [{ id: '17', usuarios: 9, cuentas: 3, analizaron: 2, pro: 1 }],
    errores: { semana: { '3|BB|CALL>FOLD': 6 }, anterior: {} } };
  const pieza = { id: '17', status: 'READY_FOR_REVIEW', platform: 'tiktok', format: 'video', category: 'decision', hook: '¿Pagas aquí en el river?', link: 'https://riopoker.es/v/17', metrics: {}, resultados: { usuarios: 9, cuentas: 3, analizaron: 2, pro: 1 } };
  const cambios = [];
  await page.route('**/api/stats**', r => r.fulfill({ status: 200, contentType: 'application/json',
    body: JSON.stringify(r.request().url().includes('vista=producto') ? producto : { dias: [], porOrigen: {}, cuentasTotales: 0 }) }));
  await page.route('**/api/content**', r => {
    const u = new URL(r.request().url());
    if (r.request().method() === 'POST'){ cambios.push(JSON.parse(r.request().postData())); return r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }); }
    const body = u.searchParams.get('vista') === 'resumen'
      ? { porEstado: { READY_FOR_REVIEW: 1 }, porCategoria: {}, porPlataforma: {}, creadasSemana: 1, publicadasSemana: 0, mejores: [pieza] }
      : (u.searchParams.get('status') === 'READY_FOR_REVIEW' ? [pieza] : []);
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
  await page.waitForFunction(() => !!document.getElementById('navAdminContent'));
  await page.evaluate(() => document.getElementById('navAdminStats').click());
  await expect(page.locator('#prodStats')).toContainText('Abrieron RÍO');
  await expect(page.locator('#prodStats')).toContainText('Pagas cuando convenía retirarse');
  await expect(page.locator('#prodStats')).toContainText('40%'); // 4 de 10 volvieron al día siguiente
  await page.evaluate(() => document.getElementById('navAdminContent').click());
  await expect(page.locator('#helpBody')).toContainText('¿Pagas aquí en el river?');
  await expect(page.locator('#helpBody')).toContainText('9 usuarios');
  await page.locator('#helpBody [data-ok="17"]').click();
  await expect.poll(() => cambios).toEqual([{ accion: 'actualizar', id: '17', status: 'APPROVED' }]);
  expect(errores).toEqual([]);
});

test('portada (landing): avisa de la visita y guarda el contenido de origen; al volver de pagar en Stripe se abre la app', async ({ page }) => {
  const eventos = [];
  page.on('request', (req) => { if (new URL(req.url()).pathname === '/api/track') eventos.push(JSON.parse(req.postData() || '{}')); });
  await abrir(page, { path: '/?utm_source=contenido&c=v7' });
  await expect.poll(() => eventos.map(e => e.e)).toContain('landing_view');
  expect(eventos.find(e => e.e === 'landing_view').c).toBe('v7');
  expect(page.url()).not.toContain('/app/');
  await page.goto('http://rio.test/', { referer: 'https://checkout.stripe.com/c/pay/cs_test' });
  await page.waitForURL(/\/app\/$/);
});

test('meter la mano: «Mesa» por defecto y «Lista» como segunda opción (se recuerda)', async ({ page }) => {
  await abrir(page);
  await expect(page.locator('#mesaSeats [data-seat]').first()).toBeVisible();
  await expect(page.locator('#listPos')).toBeHidden();
  await page.locator('[data-entrada="lista"]').click();
  await expect(page.locator('#mesaSeats [data-seat]').first()).toBeHidden();
  await expect(page.locator('#listPos')).toBeVisible();
  await page.selectOption('#listHeroPos', 'CO');
  await expect(page.locator('#heroPosInput')).toHaveValue('CO');
  await page.selectOption('#listVillPos', 'CO');                 // el mismo sitio: se intercambian
  await expect(page.locator('#heroPosInput')).toHaveValue('BB');
  await ponerMano(page, ['As', 'Kd'], ['Qs', '7c', '3h']);
  await ponerBote(page, 30, 10);
  expect(await analizar(page)).toBeTruthy();
  await page.reload();
  await expect(page.locator('#listPos')).toBeVisible();
});
