// Utilidades para las pruebas: sirven la web desde los archivos del proyecto
// (sin desplegar nada) y simulan el servidor (/api) para no tocar Stripe ni la IA.
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const ORIGIN = 'http://rio.test';

// opts.pro: la cuenta es RÍO PRO · opts.logged: hay sesión iniciada · opts.bienvenida: primera visita
// opts.api: respuestas a medida { 'analyze-table': {...} } · opts.storage: datos guardados (los textos se guardan tal cual)
async function abrir(page, opts = {}){
  const llamadas = [];
  await page.addInitScript(({ pro, logged, storage, bienvenida }) => {
    if (sessionStorage.getItem('__init')) return; // solo la primera carga, así las pruebas pueden recargar
    sessionStorage.setItem('__init', '1');
    if (!bienvenida) localStorage.setItem('rio_onboarded', 'true');
    if (pro) localStorage.setItem('rio_pro', 'true');
    if (logged || pro) localStorage.setItem('rio_token', JSON.stringify('c'.repeat(64)));
    for (const [k, v] of Object.entries(storage || {})) localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
  }, { pro: !!opts.pro, logged: !!opts.logged, storage: opts.storage || {}, bienvenida: !!opts.bienvenida });
  await page.route('**/*', (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== ORIGIN) return route.fulfill({ status: 204, body: '' }); // fuentes, analíticas…
    if (url.pathname.startsWith('/_vercel/')) return route.fulfill({ status: 200, contentType: 'application/javascript', body: '' });
    if (url.pathname.startsWith('/api/')){
      const name = url.pathname.slice(5);
      llamadas.push(name);
      const custom = opts.api && opts.api[name];
      const body = custom || (opts.pro ? { pro: true, used: 10, limit: 200, extra: 0, admin: !!opts.admin } : { pro: false, left: 4 });
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    }
    const file = url.pathname.endsWith('/') ? url.pathname + 'index.html' : url.pathname;
    return route.fulfill({ path: path.join(ROOT, file) });
  });
  const errores = [];
  page.on('pageerror', (e) => errores.push(e.message));
  await page.goto(ORIGIN + (opts.path || '/app/')); // la app vive en /app/ («/» es la landing)
  return { llamadas, errores };
}

const PALO = { s: 'Picas', h: 'Corazones', d: 'Diamantes', c: 'Tréboles' };
// carta('As') → en la ventana de cartas (ya abierta) elige el valor (A) y luego el palo (picas).
async function carta(page, c){
  const valor = c[0] === 'T' ? '10' : c[0];
  await page.locator('.rank-btn', { hasText: new RegExp('^' + valor + '$') }).click();
  await page.locator('.suit-btn', { hasText: PALO[c[1]] }).click();
  await page.waitForTimeout(350);
}
// Pone tus dos cartas y, si se indican, las comunitarias.
async function ponerMano(page, mano, mesa = []){
  await page.locator('#holeRow .cardslot').first().click();
  for (const c of mano) await carta(page, c);
  if (mesa.length){
    await page.locator('#flopRow .cardslot').first().click();
    for (let i = 0; i < mesa.length; i++){
      if (i === 3) await page.locator('#turnRow .cardslot').first().click();
      if (i === 4) await page.locator('#riverRow .cardslot').first().click();
      await carta(page, mesa[i]);
    }
  }
  if (await page.locator('#overlay.show').isVisible()) await page.locator('#closePicker').click();
}
// Escribe el bote (con la apuesta incluida) y lo que te toca pagar. En modo Fácil se pregunta
// en dos partes ("lo que había" + "lo que ha apostado tu rival"); en Avanzado, directamente.
async function ponerBote(page, bote, pagar){
  if (await page.locator('#potInput').isVisible()){
    await page.fill('#potInput', String(bote)); await page.fill('#callInput', String(pagar));
  } else {
    await page.fill('#potBeforeInput', String(bote - pagar)); await page.fill('#betInput', String(pagar));
  }
}
async function analizar(page){
  await page.locator('#analyzeBtn').click();
  await page.locator('#resultPanel.show').waitFor();
  await page.waitForTimeout(300);
  return (await page.locator('#decisionBadge').innerText()).trim();
}
// Posiciones tocando los asientos de la mesa (tu sitio y, si se indica, el del rival).
async function ponerPosiciones(page, yo, rival){
  if (yo) await page.locator(`#mesaSeats [data-seat="${yo}"]`).click();
  if (rival){
    await page.locator('[data-seatmode="vill"]').click();
    await page.locator(`#mesaSeats [data-seat="${rival}"]`).click();
    await page.locator('[data-seatmode="hero"]').click();
  }
}
// La hoja «Ajustar detalles» (rival, rivales, partida, secuencia, stacks…).
async function abrirDetalles(page){ await page.locator('#moreToggle').click(); await page.locator('#detailsSheet').waitFor(); }
async function cerrarDetalles(page){ await page.locator('#sheetDone').click(); await page.locator('#detailsSheet').waitFor({ state: 'hidden' }); }
// La partida de práctica se abre desde Practicar.
async function abrirPartida(page){ await page.goto(ORIGIN + '/app/#/practicar'); await page.locator('[data-pr="partida"]').click(); }
module.exports = { abrir, carta, ponerMano, ponerBote, analizar, ponerPosiciones, abrirDetalles, cerrarDetalles, abrirPartida, ORIGIN };
