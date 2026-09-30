// Lógica de la calculadora (index.html). Se carga con defer, después de pintar la página.
(function(){
  "use strict";
  const RANKS = [14,13,12,11,10,9,8,7,6,5,4,3,2];
  const SUITS = ['s','h','d','c'];
  const SUIT_SYMBOL = {s:'♠', h:'♥', d:'♦', c:'♣'};
  const SUIT_NAME = {s:'Picas', h:'Corazones', d:'Diamantes', c:'Tréboles'};
  const SUIT_CRIMSON = {s:false, h:true, d:true, c:false};
  const RANK_LABEL = r => r<=10 ? String(r) : ({11:'J',12:'Q',13:'K',14:'A'}[r]);
  const RANK_PLURAL = {14:'Ases',13:'Reyes',12:'Reinas',11:'Jotas',10:'Dieces',9:'Nueves',8:'Ochos',7:'Sietes',6:'Seises',5:'Cincos',4:'Cuatros',3:'Treses',2:'Doses'};
  const SLOT_ORDER = [{zone:'hole',idx:0},{zone:'hole',idx:1},{zone:'board',idx:0},{zone:'board',idx:1},{zone:'board',idx:2},{zone:'board',idx:3},{zone:'board',idx:4}];

  const FREE_LIMIT = 10; // análisis gratis con cuenta (lo cuenta el servidor)
  const MONTHLY_CREDITS = 200;           // créditos de IA incluidos en PRO cada mes (igual que lib/quota.js)
  const PHOTOS_INCLUDED = MONTHLY_CREDITS;
  const APP_VERSION = 'v1.4'; // única versión de la app: se muestra en el menú y en Tu plan
  document.querySelectorAll('.app-version').forEach(el => { el.textContent = APP_VERSION; });
  const PRO_PRICE_LABEL = '9,99 €';
  const PAYMENT_LINK = 'https://buy.stripe.com/7sYaEZ8bB2bW8uh7Ko9IQ02'; // RÍO PRO · 9,99 €/mes
  // Abre un enlace de pago de Stripe con el email de tu cuenta ya puesto y, además, un
  // identificador de tu cuenta (client_reference_id): así el servidor asocia el pago a tu
  // cuenta aunque pagues con otro email (por ejemplo, con Apple Pay). Ver lib/stripe.js.
  let pendingPayment = null;
  function openPayment(link){
    trackEvent('pago');
    // Sin cuenta, el pago no se podría asociar a nadie: primero entrar o crear la cuenta gratis.
    if (!storageGet('rio_token', '')){
      pendingPayment = link;
      openPaywall('login');
      document.getElementById('paywallTitle').textContent = 'Primero, entra en tu cuenta';
      document.getElementById('paywallCopy').innerHTML = 'Para que tu pago quede asociado a tu cuenta, entra o crea tu cuenta gratis (solo tu email y un código). Justo después podrás pagar.';
      return;
    }
    let url = link;
    try {
      const email = JSON.parse(localStorage.getItem('rio_email') || '""');
      if (email){
        const ref = 'rio_' + btoa(unescape(encodeURIComponent(email))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        url += (link.includes('?') ? '&' : '?') + 'prefilled_email=' + encodeURIComponent(email) + '&client_reference_id=' + ref;
      }
    } catch (e) {}
    window.open(url, '_blank');
  }
  const CREDIT_PACK_LINK = 'https://buy.stripe.com/dRmfZjbnN2bWfWJ4yc9IQ01'; // pack antiguo (50 créditos · 2,99 €)
  // Packs de créditos (pago único). Pega aquí el Payment Link de cada uno; los
  // que no tengan enlace no se muestran. Sin ninguno, se ofrece el pack antiguo.
  const CREDIT_PACKS_UI = [
    { credits: 100,  price: '2,99 €',  unit: '3 cént. por crédito',   link: 'https://buy.stripe.com/8x2aEZbnN17SaCp5Cg9IQ03' },
    { credits: 300,  price: '6,99 €',  unit: '2,3 cént. por crédito', link: 'https://buy.stripe.com/aFa8wR8bB9Eoh0Nd4I9IQ04', best: true },
    { credits: 1000, price: '17,99 €', unit: '1,8 cént. por crédito', link: 'https://buy.stripe.com/eVq6oJ1Nd7wg25Tc0E9IQ05' }
  ];
  function activePacks(){
    const packs = CREDIT_PACKS_UI.filter(pk => pk.link);
    return packs.length ? packs : [{ credits: 50, price: '2,99 €', unit: '6 cént. por crédito', link: CREDIT_PACK_LINK }];
  }
  const API_ENDPOINT = '/api/check-pro'; // ruta relativa: funciona sola una vez desplegado en Vercel junto a la carpeta /api

  function storageGet(key, fallback){
    try { const v = localStorage.getItem(key); return v===null ? fallback : JSON.parse(v); }
    catch(e){ return fallback; }
  }
  // Valores guardados como texto simple (no JSON), p. ej. los que pone el script de estadísticas del <head>.
  function rawStorage(key){ try { return localStorage.getItem(key) || ''; } catch(e){ return ''; } }
  // Avisa al servidor para las estadísticas del administrador (sin datos personales).
  function trackEvent(ev){
    if (rawStorage('rio_sin_estadisticas') === '1') return;
    try { navigator.sendBeacon('/api/track?e=' + encodeURIComponent(ev)); } catch(e){}
  }
  function storageSet(key, val){ try { localStorage.setItem(key, JSON.stringify(val)); } catch(e){} onStoredKey(key); }

  function isPro(){ return storageGet('rio_pro', false) === true; }
  // Token de sesión que nos da el servidor tras verificar el código del email.
  function authHeaders(){
    const token = storageGet('rio_token', '');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }
  function logoutPro(){
    storageSet('rio_pro', false);
    try { localStorage.removeItem('rio_token'); } catch(e){}
  }
  // Análisis gratis que le quedan a la cuenta (lo decide el servidor; esto es la última cifra conocida).
  function freeLeft(){ return storageGet('rio_free_left', FREE_LIMIT); }
  let pendingAnalyze = false;
  async function refreshFreeLeft(){
    if (!storageGet('rio_token', '') || isPro()) return;
    try {
      const r = await fetch('/api/free-use', { headers: authHeaders() });
      const d = await r.json();
      if (r.ok && typeof d.left === 'number'){ storageSet('rio_free_left', d.left); updateUsageBadge(); renderPlanInfo(); }
    } catch(e){}
  }

  let photoUsage = { pro: false, used: 0, limit: PHOTOS_INCLUDED, extra: 0 };
  async function refreshPhotoUsage(){
    if (!storageGet('rio_token', '') || !isPro()){
      photoUsage = { pro: false, used: 0, limit: PHOTOS_INCLUDED, extra: 0 };
      renderPlanInfo();
      return;
    }
    try {
      const r = await fetch('/api/photo-usage', { headers: authHeaders() });
      const data = await r.json();
      if (data && data.pro) photoUsage = data;
    } catch(e){}
    renderPlanInfo();
  }
  function renderPlanInfo(){
    const pro = isPro();
    const sidebarFootEl = document.getElementById('sidebarFoot');
    if (sidebarFootEl){
      const bar = (used, total) => `<div class="usage-bar"><i style="width:${Math.min(100, Math.round(used / Math.max(1, total) * 100))}%"></i></div>`;
      if (pro){
        sidebarFootEl.innerHTML = `<div class="plan-line"><span class="pro-pill">★ RÍO PRO</span><span>Análisis ilimitados</span></div>
          <div class="usage-text">Créditos de IA: <b>${Math.min(photoUsage.used, photoUsage.limit)}/${photoUsage.limit}</b> este mes${photoUsage.extra > 0 ? ` · +${photoUsage.extra} comprados` : ''}</div>${bar(photoUsage.used, photoUsage.limit)}`;
      } else if (storageGet('rio_token', '')){
        const left = freeLeft();
        sidebarFootEl.innerHTML = `<div class="plan-line"><span class="pro-pill free">PLAN GRATIS</span></div>
          <div class="usage-text">Te quedan <b>${left} de ${FREE_LIMIT}</b> análisis gratis</div>${bar(FREE_LIMIT - left, FREE_LIMIT)}`;
      } else {
        sidebarFootEl.innerHTML = `<div class="plan-line"><span class="pro-pill free">SIN CUENTA</span></div>
          <div class="usage-text">${storageGet('rio_anon_used', false) ? `Ya usaste tu análisis de prueba. Crea tu cuenta gratis y tendrás ${FREE_LIMIT} más.` : `Tienes <b>1 análisis de prueba</b>; con tu cuenta gratis, ${FREE_LIMIT} más.`}</div>`;
      }
    }
    const freeBadge = document.getElementById('freePlanBadge');
    const proBadge = document.getElementById('proPlanBadge');
    const freeCard = document.getElementById('freePlanCard');
    const proCard = document.getElementById('proPlanCard');
    if (freeBadge) freeBadge.style.display = pro ? 'none' : 'inline-block';
    if (proBadge) proBadge.style.display = pro ? 'inline-block' : 'none';
    if (freeCard) freeCard.classList.toggle('active', !pro);
    if (proCard) proCard.classList.toggle('active', pro);

    const subscribeFromPlanBtn = document.getElementById('subscribeFromPlanBtn');
    if (subscribeFromPlanBtn) subscribeFromPlanBtn.style.display = pro ? 'none' : 'inline-block';
    const annualCard = document.getElementById('annualPlanCard');
    if (annualCard) annualCard.style.display = (pro || !ANNUAL_PAYMENT_LINK) ? 'none' : '';
    const planCards = document.querySelector('#planPanel .plan-cards');
    if (planCards) planCards.classList.toggle('no-annual', pro || !ANNUAL_PAYMENT_LINK);
    document.querySelectorAll('#proPlanCard .paid-check, #proPlanCard .paid-msg').forEach(el => { el.style.display = pro ? 'none' : ''; });

    const photoBox = document.getElementById('photoUsageBox');
    if (photoBox){
      const left = Math.max(0, photoUsage.limit - photoUsage.used);
      photoBox.textContent = pro
        ? `Te quedan ${left} de ${photoUsage.limit} créditos este mes${photoUsage.extra > 0 ? ` · +${photoUsage.extra} créditos comprados` : ''}`
        : '';
    }
    renderPlanPacks(pro);
    updateAccountUI();
  }

  // Menú de cuenta: iniciar/cerrar sesión y gestionar la suscripción.
  function updateAccountUI(){
    const logged = !!storageGet('rio_token', '');
    const canManage = logged && isPro();
    document.getElementById('navLogin').style.display = logged ? 'none' : '';
    document.getElementById('navLogout').style.display = logged ? '' : 'none';
    // "Gestionar suscripción" ya está en el botón de la tarjeta de cuenta.
    document.getElementById('navManage').style.display = 'none';
    document.querySelectorAll('.sidebar-link .pro-badge').forEach(el => { el.style.display = isPro() ? 'none' : ''; });
    // El botón de administración solo se crea si el servidor ha confirmado que la cuenta es admin.
    const admin = logged && storageGet('rio_admin', false);
    let inboxBtn = document.getElementById('navInbox');
    if (admin && !inboxBtn){
      inboxBtn = document.createElement('button');
      inboxBtn.type = 'button'; inboxBtn.className = 'sidebar-link'; inboxBtn.id = 'navInbox';
      inboxBtn.innerHTML = '<span class="ic">📥</span><span class="lbl">Avisos de usuarios</span><span class="admin-badge">ADMIN</span>';
      inboxBtn.addEventListener('click', () => openInbox());
      document.getElementById('navLogout').insertAdjacentElement('beforebegin', inboxBtn);
    } else if (!admin && inboxBtn) inboxBtn.remove();
    let statsBtn = document.getElementById('navAdminStats');
    if (admin && !statsBtn){
      statsBtn = document.createElement('button');
      statsBtn.type = 'button'; statsBtn.className = 'sidebar-link'; statsBtn.id = 'navAdminStats';
      statsBtn.innerHTML = '<span class="ic">📊</span><span class="lbl">Estadísticas</span><span class="admin-badge">ADMIN</span>';
      statsBtn.addEventListener('click', () => openAdminStats());
      document.getElementById('navInbox').insertAdjacentElement('beforebegin', statsBtn);
    } else if (!admin && statsBtn) statsBtn.remove();
    document.getElementById('manageSubBtn').style.display = canManage ? 'inline-block' : 'none';
    document.getElementById('manageSubHint').style.display = canManage ? 'block' : 'none';
    document.getElementById('sidebarAccount').textContent = logged ? storageGet('rio_email', '') : 'Sin cuenta · tus datos solo en este navegador';
    const cta = document.getElementById('acctCta');
    if (!logged){ cta.textContent = 'Entrar o crear cuenta gratis'; cta.dataset.go = 'login'; cta.className = 'acct-cta'; }
    else if (!isPro()){ cta.textContent = `⭐ Hazte PRO · ${PRO_PRICE_LABEL}/mes`; cta.dataset.go = 'plans'; cta.className = 'acct-cta gold'; }
    else { cta.textContent = '💳 Gestionar suscripción'; cta.dataset.go = 'manage'; cta.className = 'acct-cta ghost'; }
  }
  async function openBillingPortal(){
    const msg = document.getElementById('manageSubMsg');
    msg.textContent = 'Abriendo Stripe…'; msg.className = 'restore-msg';
    try {
      const r = await fetch('/api/billing-portal', { method: 'POST', headers: authHeaders() });
      const data = await r.json();
      if (r.ok && data.url){ window.location.href = data.url; return; }
      msg.textContent = data.error || 'No se pudo abrir el portal de Stripe.'; msg.className = 'restore-msg no';
    } catch(e){
      msg.textContent = 'No se pudo contactar con el servidor. Inténtalo de nuevo.'; msg.className = 'restore-msg no';
    }
  }
  async function doLogout(){
    try { await fetch('/api/logout', { method: 'POST', headers: authHeaders() }); } catch(e){}
    logoutPro();
    try { localStorage.removeItem('rio_email'); } catch(e){}
    photoUsage = { pro: false, used: 0, limit: PHOTOS_INCLUDED, extra: 0 };
    try { localStorage.removeItem('rio_admin'); localStorage.removeItem('rio_free_left'); } catch(e){}
    updateUsageBadge(); renderHistory(); renderPlanInfo();
  }

  function getProfile(){
    let p = storageGet('rio_profile', null);
    if (!p || !p.name){
      p = { id: 'u_' + Math.random().toString(36).slice(2,10), name: 'Jugador ' + Math.floor(1000+Math.random()*9000), createdAt: Date.now() };
      storageSet('rio_profile', p);
    }
    return p;
  }
  function saveProfileName(name){
    const p = getProfile();
    p.name = (name || '').trim().slice(0,24) || p.name;
    storageSet('rio_profile', p);
    return p;
  }
  function updateProfileUI(){
    const p = getProfile();
    document.getElementById('sidebarProfile').textContent = p.name;
    document.getElementById('acctAvatar').textContent = (p.name.trim()[0] || 'R').toUpperCase();
    const nameInput = document.getElementById('profileNameInput');
    if (nameInput) nameInput.value = p.name;
  }
  const HISTORY_MAX = 200;
  function getHistory(){ return storageGet('rio_history', []); }
  function pushHistory(entry){
    if (!storageGet('rio_save_history', true)) return;
    const h = getHistory(); h.unshift(entry);
    storageSet('rio_history', h.slice(0, HISTORY_MAX));
  }

  // Pregunta a nuestro pequeño servidor (que a su vez pregunta a Stripe) si la
  // sesión guardada sigue teniendo una suscripción activa. Devuelve true/false,
  // o 'logout' si la sesión ya no es válida. Nunca lanza error.
  async function verifyProSession(deep){
    try {
      const r = await fetch(API_ENDPOINT + (deep ? '?deep=1' : ''), { headers: authHeaders() });
      if (r.status === 401) return 'logout';
      const data = await r.json();
      if (!r.ok) return null;
      storageSet('rio_admin', data.admin === true);
      // Las visitas y clics del administrador no cuentan en las estadísticas.
      if (data.admin === true) try { localStorage.setItem('rio_sin_estadisticas', '1'); } catch(e){}
      return data.pro === true;
    } catch(e){ return null; } // null = no se pudo comprobar (servidor no desplegado aún, sin conexión…)
  }

  // Si ya iniciamos sesión antes en este navegador, lo revalidamos en segundo
  // plano al cargar la página (por si la suscripción caducó o se canceló).
  (function revalidateOnLoad(){
    if (!storageGet('rio_token', '')){
      // Los análisis gratis ya no se cuentan en el navegador.
      try { localStorage.removeItem('rio_uses'); } catch(e){}
      // Sesiones antiguas (solo email, sin código): hay que volver a entrar.
      if (isPro()) logoutPro();
      restoreFromCookie();
      return;
    }
    recheckPro(true);
  })();

  // Vuelve a preguntar al servidor si eres PRO. Se usa al abrir la página, al volver
  // a RÍO desde otra pestaña (por ejemplo, tras pagar en Stripe) y con el botón
  // "Ya he pagado, comprobar". Devuelve true, false o null (sin respuesta).
  // Si el navegador borró los datos de la página pero conserva la cookie de sesión, la recuperamos
  // sin pedir otra vez el código.
  async function restoreFromCookie(){
    try {
      const r = await fetch('/api/session', { credentials: 'same-origin' });
      if (!r.ok) return;
      const d = await r.json();
      if (typeof d.token !== 'string' || !/^[a-f0-9]{64}$/.test(d.token) || !d.email) return;
      storageSet('rio_token', d.token); storageSet('rio_email', d.email);
      await recheckPro(true);
      if (typeof updateUsageBadge === 'function') updateUsageBadge();
    } catch(e){}
  }
  var lastProCheck = 0; // "var": revalidateOnLoad() la usa antes de llegar a esta línea
  async function recheckPro(force, deep){
    if (!storageGet('rio_token', '')) return false;
    if (!force && Date.now() - lastProCheck < 15000) return null;
    lastProCheck = Date.now();
    const pro = await verifyProSession(deep);
    if (pro === null) return null; // sin respuesta del servidor: no tocamos nada
    if (pro === 'logout'){ logoutPro(); return false; }
    storageSet('rio_pro', pro);
    refreshFreeLeft(); pullSync(); updateAccountUI();
    if (typeof updateUsageBadge === 'function') updateUsageBadge();
    refreshPhotoUsage();
    return pro;
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && !isPro()) recheckPro(false);
  });

  let hole = [null, null];
  let board = [null, null, null, null, null];
  let numRivals = 1;
  let lastWin = null, lastTie = null, lastOop = false, lastE2 = null;
  let activeSlot = null;
  // Orden de acción postflop estándar: la ciega pequeña actúa primero en cada calle
  // y el botón el último. Con esto derivamos automáticamente quién va "en posición".
  const POSITION_ORDER = ['SB','BB','UTG','HJ','CO','BTN'];
  function heroIsOOP(){
    const heroPos = document.getElementById('heroPosInput').value;
    const villPos = document.getElementById('villPosInput').value;
    const hi = POSITION_ORDER.indexOf(heroPos), vi = POSITION_ORDER.indexOf(villPos);
    return hi <= vi; // actúa igual o antes que el rival → fuera de posición
  }
  function updateOrderHint(){
    const heroPos = document.getElementById('heroPosInput').value;
    const villPos = document.getElementById('villPosInput').value;
    const oop = heroIsOOP();
    document.getElementById('orderHint').textContent = oop
      ? `Con ${heroPos} vs ${villPos}: vas fuera de posición — actúas antes que tu rival.`
      : `Con ${heroPos} vs ${villPos}: tienes posición — tu rival actúa antes que tú.`;
  }

  let pickStep = 'rank';
  let pickedRank = null;

  const holeRow = document.getElementById('holeRow');
  const flopRow = document.getElementById('flopRow');
  const turnRow = document.getElementById('turnRow');
  const riverRow = document.getElementById('riverRow');
  const currentHandEl = document.getElementById('currentHand');
  const overlay = document.getElementById('overlay');
  const pickerBody = document.getElementById('pickerBody');
  const pickerTitle = document.getElementById('pickerTitle');
  const resultPanel = document.getElementById('resultPanel');

  function allUsedCards(){ return [...hole, ...board].filter(Boolean); }
  function cardKey(c){ return c.rank+'-'+c.suit; }
  function isUsed(rank,suit){ return allUsedCards().some(c=>c.rank===rank && c.suit===suit); }

  function makeSlotBtn(zone, idx, card){
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'cardslot ' + (card ? 'filled' : 'empty');
    if (card && SUIT_CRIMSON[card.suit]) btn.classList.add('crimson');
    if (card){
      btn.innerHTML = `<span class="r">${RANK_LABEL(card.rank)}</span><span class="s">${SUIT_SYMBOL[card.suit]}</span>`;
    } else {
      btn.textContent = '+';
    }
    btn.addEventListener('click', () => openPicker(zone, idx));
    return btn;
  }

  function render(justFilled){
    holeRow.innerHTML=''; flopRow.innerHTML=''; turnRow.innerHTML=''; riverRow.innerHTML='';
    holeRow.appendChild(makeSlotBtn('hole',0,hole[0]));
    holeRow.appendChild(makeSlotBtn('hole',1,hole[1]));
    for (let i=0;i<3;i++) flopRow.appendChild(makeSlotBtn('board', i, board[i]));
    turnRow.appendChild(makeSlotBtn('board', 3, board[3]));
    riverRow.appendChild(makeSlotBtn('board', 4, board[4]));

    if (justFilled){
      const sel = justFilled.zone==='hole'
        ? holeRow.children[justFilled.idx]
        : (justFilled.idx<3 ? flopRow.children[justFilled.idx] : justFilled.idx===3 ? turnRow.children[0] : riverRow.children[0]);
      if (sel){ sel.classList.add('pop'); }
    }

    if (selStreet !== null && selStreet === cardStreets() - 1) selStreet = null;
    const si = analysisStreet();
    ['Preflop','Flop','Turn','River'].forEach((name, i) => {
      const dot = document.getElementById('dot'+name);
      const lbl = document.getElementById('lbl'+name);
      dot.classList.toggle('done', i < si);
      dot.classList.toggle('active', i === si);
      lbl.classList.toggle('active', i === si);
    });

    updateCurrentHand();
    renderBoardState();
    renderRangeUI();
    renderSeq(); syncFromSeq(); renderStreetBtns();
    resultPanel.classList.remove('show');
    updateSticky();
    easyPotFromMain();
  }

  // Móvil: barra fija con "Analizar mano" cuando ya tienes tus cartas y el botón normal no se ve.
  let analyzeInView = false, resultInView = false;
  function updateSticky(){
    // Solo antes de analizar: con el resultado a la vista ya no hace falta.
    const show = !!(hole[0] && hole[1]) && !analyzeInView && !resultInView && !resultPanel.classList.contains('show');
    document.getElementById('stickyAnalyze').classList.toggle('show', show);
    document.body.classList.toggle('has-sticky', show);
  }
  if ('IntersectionObserver' in window){
    new IntersectionObserver(es => { analyzeInView = es[0].isIntersecting; updateSticky(); }).observe(document.getElementById('analyzeBtn'));
    new IntersectionObserver(es => { resultInView = es[0].isIntersecting; updateSticky(); }).observe(document.getElementById('resultPanel'));
  }
  document.getElementById('stickyAnalyzeBtn').addEventListener('click', () => document.getElementById('analyzeBtn').click());

  // ---- Modo Fácil: bote en dos preguntas y pasos con guía ----
  // Los campos de verdad siguen siendo potInput (bote, con la apuesta incluida) y callInput
  // (lo que pagas); en Fácil se rellenan desde "lo que había" + "lo que ha apostado".
  const potBeforeEl = document.getElementById('potBeforeInput'), betEl = document.getElementById('betInput');
  const round2 = (n) => Math.round(n * 100) / 100;
  function renderEasySum(){
    const potEl = document.getElementById('potInput'), callEl = document.getElementById('callInput');
    const sumEl = document.getElementById('easyPotSum');
    if (potEl.value === '' && callEl.value === ''){ sumEl.innerHTML = ''; return; }
    const pot = Number(potEl.value) || 0, call = Number(callEl.value) || 0;
    const auto = seqHasActions() ? ' <small>(calculado con la secuencia de apuestas)</small>' : ' <small>(RÍO lo calcula solo)</small>';
    sumEl.innerHTML = call > 0
      ? `→ Bote <b>${fmtN(pot)}</b> · te toca pagar <b>${fmtN(call)}</b>${auto}`
      : `→ Nadie ha apostado: bote <b>${fmtN(pot)}</b>, no te toca pagar nada${auto}`;
  }
  // bote/pagar → las dos preguntas (al cargar una captura, el ejemplo, una mano compartida…)
  function easyPotFromMain(){
    const potEl = document.getElementById('potInput'), callEl = document.getElementById('callInput');
    const pot = Number(potEl.value) || 0, call = Number(callEl.value) || 0;
    potBeforeEl.value = potEl.value === '' && callEl.value === '' ? '' : round2(Math.max(0, pot - call));
    betEl.value = callEl.value === '' ? '' : round2(call);
    const auto = seqHasActions();
    potBeforeEl.readOnly = auto; betEl.readOnly = auto; document.getElementById('noBetBtn').disabled = auto;
    renderEasySum(); updateSteps();
  }
  // las dos preguntas → bote/pagar
  function mainFromEasy(){
    const potEl = document.getElementById('potInput'), callEl = document.getElementById('callInput');
    const before = Number(potBeforeEl.value) || 0, bet = Number(betEl.value) || 0;
    potEl.value = potBeforeEl.value === '' && betEl.value === '' ? '' : round2(before + bet);
    callEl.value = betEl.value === '' ? '' : round2(bet);
    renderEasySum(); updateSteps();
  }
  potBeforeEl.addEventListener('input', mainFromEasy);
  betEl.addEventListener('input', mainFromEasy);
  document.getElementById('noBetBtn').addEventListener('click', () => { betEl.value = 0; mainFromEasy(); });
  ['potInput', 'callInput'].forEach(id => document.getElementById(id).addEventListener('input', easyPotFromMain));

  let posTouched = false;
  function updateSteps(){
    const s1 = !!(hole[0] && hole[1]);
    const s3 = document.getElementById('callInput').value !== '' || seqHasActions();
    const s2 = s1 && (posTouched || s3 || potBeforeEl.value !== '');
    const cur = !s1 ? 1 : !s2 ? 2 : !s3 ? 3 : 0;
    [['cardsPanel', s1, 1], ['tablePanel', s2, 2], ['betsPanel', s3, 3]].forEach(([id, done, n]) => {
      const el = document.getElementById(id);
      el.classList.toggle('step-done', done && cur !== n);
      el.classList.toggle('step-current', cur === n);
    });
    document.getElementById('stepGuide2').style.display = cur === 2 ? '' : 'none';
    document.getElementById('stepGuide3').style.display = cur === 3 ? '' : 'none';
    document.getElementById('stepTodo').innerHTML = [
      '✅ <b>¡Listo!</b> Pulsa <b>Analizar mano</b>.',
      'Falta: <b>elige tus dos cartas</b>.',
      'Falta: <b>dinos dónde estás sentado</b> (o pulsa «Está bien así»).',
      'Falta: <b>di cuánto ha apostado tu rival</b> (o «Nadie ha apostado»).'][cur];
  }
  ['heroPosInput', 'villPosInput'].forEach(id => document.getElementById(id).addEventListener('change', () => { posTouched = true; updateSteps(); }));
  document.getElementById('posOkBtn').addEventListener('click', () => {
    posTouched = true; updateSteps();
    document.getElementById('betsPanel').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  function updateCurrentHand(){
    const known = [...hole, ...board].filter(Boolean);
    if (!hole[0] || !hole[1]){ currentHandEl.textContent = 'Elige tus dos cartas para empezar.'; return; }
    if (known.length < 5){
      const [a,b] = hole;
      const tag = strengthTag(handTopPercent(a, b));
      if (a.rank === b.rank){
        currentHandEl.innerHTML = `Mano de partida: <b>Pareja de ${RANK_PLURAL[a.rank]}</b>${tag}${openAdvice(a, b)}`;
      } else {
        const suited = a.suit === b.suit ? ' (mismo palo)' : '';
        const hi = a.rank>b.rank?a:b, lo=a.rank>b.rank?b:a;
        currentHandEl.innerHTML = `Mano de partida: <b>${RANK_LABEL(hi.rank)}-${RANK_LABEL(lo.rank)}${suited}</b>${tag}${openAdvice(a, b)}`;
      }
      return;
    }
    const best = bestHand(known);
    currentHandEl.innerHTML = `Mano actual: <b>${categoryName(best.category, best.tiebreak)}</b>`;
  }

  // En qué calle estás según las comunitarias puestas, y aviso de que no hacen falta las 5.
  function renderBoardState(){
    const n = board.filter(Boolean).length;
    const flopN = board.slice(0, 3).filter(Boolean).length;
    const cs = cardStreets(); // 1 preflop … 4 river
    document.getElementById('streetNow').textContent = ['Preflop', 'Flop', 'Turn', 'River'][cs - 1];
    const groups = [
      { el: 'tagFlop', name: 'Flop', done: flopN === 3, street: 2 },
      { el: 'tagTurn', name: 'Turn', done: !!board[3], street: 3 },
      { el: 'tagRiver', name: 'River', done: !!board[4], street: 4 }];
    const divs = document.querySelectorAll('.board-groups > div');
    groups.forEach((g, i) => {
      const tag = document.getElementById(g.el);
      tag.classList.toggle('done', g.done);
      const isNext = g.street === cs + 1;
      tag.innerHTML = g.name + (g.done ? ' ✓' : '') + (!g.done && isNext && cs > 1 ? '<small>solo si ya salió</small>' : '');
      divs[i].classList.toggle('next', isNext);
      divs[i].classList.toggle('cur', g.street === cs);
    });
    let hint;
    if (n === 0) hint = 'Pon <b>solo las cartas que ya han salido</b>. ¿Estás antes del flop? Déjalas vacías.';
    else if (flopN < 3) hint = `El flop son 3 cartas: ${flopN === 2 ? 'falta 1' : 'faltan ' + (3 - flopN)}.`;
    else if (cs === 2) hint = '<b>Estás en el flop.</b> No hace falta poner el turn ni el river: añádelos solo si ya han salido.';
    else if (cs === 3) hint = '<b>Estás en el turn.</b> Añade el river solo si ya ha salido.';
    else hint = '<b>Estás en el river</b>: la mesa está completa.';
    document.getElementById('boardHint').innerHTML = hint;
  }

  function nextEmptySlot(afterZone, afterIdx){
    const curIndex = SLOT_ORDER.findIndex(o=>o.zone===afterZone && o.idx===afterIdx);
    for (let i=curIndex+1;i<SLOT_ORDER.length;i++){
      const o = SLOT_ORDER[i];
      const val = o.zone==='hole' ? hole[o.idx] : board[o.idx];
      if (!val) return o;
    }
    return null;
  }

  function openPicker(zone, idx){
    activeSlot = {zone, idx};
    pickStep = 'rank';
    pickedRank = null;
    document.getElementById('clearSlotBtn').style.display = (zone==='hole'?hole[idx]:board[idx]) ? 'block' : 'none';
    renderPickerStep();
    overlay.classList.add('show');
  }
  function closePicker(){ overlay.classList.remove('show'); activeSlot = null; }
  document.getElementById('closePicker').addEventListener('click', closePicker);
  overlay.addEventListener('click', (e)=>{ if (e.target === overlay) closePicker(); });

  function slotLabel(){
    if (!activeSlot) return '';
    const i = activeSlot.idx;
    if (activeSlot.zone === 'hole') return `Tu carta ${i + 1} de 2 · `;
    return i < 3 ? `Flop · carta ${i + 1} de 3 · ` : i === 3 ? 'Turn · ' : 'River · ';
  }
  function renderPickerStep(){
    pickerBody.innerHTML = '';
    if (pickStep === 'rank'){
      pickerTitle.textContent = slotLabel() + 'Elige el valor';
      const grid = document.createElement('div');
      grid.className = 'rank-grid';
      for (const rank of RANKS){
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'rank-btn'; b.textContent = RANK_LABEL(rank);
        const available = SUITS.some(s => !isUsed(rank, s) || (activeSlot && (activeSlot.zone==='hole'?hole[activeSlot.idx]:board[activeSlot.idx]) && (activeSlot.zone==='hole'?hole[activeSlot.idx]:board[activeSlot.idx]).rank===rank && (activeSlot.zone==='hole'?hole[activeSlot.idx]:board[activeSlot.idx]).suit===s));
        b.disabled = !available;
        b.addEventListener('click', () => { pickedRank = rank; pickStep = 'suit'; renderPickerStep(); });
        grid.appendChild(b);
      }
      pickerBody.appendChild(grid);
    } else {
      pickerTitle.textContent = slotLabel() + RANK_LABEL(pickedRank) + ' — elige el palo';
      const back = document.createElement('button');
      back.type = 'button'; back.className = 'back-btn'; back.textContent = '← Cambiar valor';
      back.addEventListener('click', () => { pickStep = 'rank'; renderPickerStep(); });
      pickerBody.appendChild(back);
      const grid = document.createElement('div');
      grid.className = 'suit-grid';
      for (const suit of SUITS){
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'suit-btn ' + (SUIT_CRIMSON[suit] ? 'crimson' : 'black');
        b.innerHTML = `${SUIT_SYMBOL[suit]}<small>${SUIT_NAME[suit]}</small>`;
        const current = activeSlot ? (activeSlot.zone==='hole'?hole[activeSlot.idx]:board[activeSlot.idx]) : null;
        const usedByOther = isUsed(pickedRank, suit) && !(current && current.rank===pickedRank && current.suit===suit);
        b.disabled = usedByOther;
        b.addEventListener('click', () => selectCard(pickedRank, suit));
        grid.appendChild(b);
      }
      pickerBody.appendChild(grid);
    }
  }

  function selectCard(rank, suit){
    if (!activeSlot) return;
    const card = {rank, suit};
    const slot = activeSlot;
    if (slot.zone === 'hole') hole[slot.idx] = card; else board[slot.idx] = card;
    closePicker();
    render(slot);
    const nxt = nextEmptySlot(slot.zone, slot.idx);
    // Solo avanza automáticamente dentro de tu mano o dentro del flop.
    // Al pasar de la mano a las comunitarias, o del flop al turn y al river, hace falta
    // pinchar tú: así queda claro que no hacen falta las 5 comunitarias.
    const sameGroup = slot.zone === 'hole' || (slot.idx < 2);
    if (nxt && nxt.zone === slot.zone && sameGroup && (nxt.zone === 'hole' || nxt.idx < 3)){
      setTimeout(() => openPicker(nxt.zone, nxt.idx), 320);
    }
  }

  document.getElementById('clearSlotBtn').addEventListener('click', () => {
    if (!activeSlot) return;
    if (activeSlot.zone === 'hole') hole[activeSlot.idx] = null; else board[activeSlot.idx] = null;
    closePicker();
    render();
  });

  function combinations(arr,k){
    const res=[]; const combo=[];
    (function helper(start){
      if (combo.length===k){ res.push(combo.slice()); return; }
      for (let i=start;i<arr.length;i++){ combo.push(arr[i]); helper(i+1); combo.pop(); }
    })(0);
    return res;
  }

  function eval5(cards){
    const ranks = cards.map(c=>c.rank).sort((a,b)=>b-a);
    const suits = cards.map(c=>c.suit);
    const isFlush = suits.every(s=>s===suits[0]);
    const uniq = [...new Set(ranks)];
    let isStraight=false, straightHigh=0;
    if (uniq.length===5){
      if (uniq[0]-uniq[4]===4){ isStraight=true; straightHigh=uniq[0]; }
      else if (uniq[0]===14 && uniq[1]===5 && uniq[2]===4 && uniq[3]===3 && uniq[4]===2){ isStraight=true; straightHigh=5; }
    }
    const countMap={};
    ranks.forEach(r=>countMap[r]=(countMap[r]||0)+1);
    const groups = Object.entries(countMap).map(([r,c])=>({r:Number(r),c})).sort((a,b)=> b.c-a.c || b.r-a.r);
    let category, tiebreak;
    if (isStraight && isFlush){ category=8; tiebreak=[straightHigh,0,0,0,0]; }
    else if (groups[0].c===4){ category=7; tiebreak=[groups[0].r, groups[1].r,0,0,0]; }
    else if (groups[0].c===3 && groups[1] && groups[1].c===2){ category=6; tiebreak=[groups[0].r, groups[1].r,0,0,0]; }
    else if (isFlush){ category=5; tiebreak=ranks; }
    else if (isStraight){ category=4; tiebreak=[straightHigh,0,0,0,0]; }
    else if (groups[0].c===3){ const kick=groups.filter(g=>g.c===1).map(g=>g.r); category=3; tiebreak=[groups[0].r, ...kick, 0,0].slice(0,5); }
    else if (groups[0].c===2 && groups[1] && groups[1].c===2){
      const pr=[groups[0].r, groups[1].r].sort((a,b)=>b-a);
      const kicker = groups.find(g=>g.c===1).r;
      category=2; tiebreak=[pr[0], pr[1], kicker, 0,0];
    }
    else if (groups[0].c===2){ const kick=groups.filter(g=>g.c===1).map(g=>g.r).sort((a,b)=>b-a); category=1; tiebreak=[groups[0].r, ...kick, 0].slice(0,5); }
    else { category=0; tiebreak=ranks; }
    let score=category;
    for (const t of tiebreak){ score = score*15+t; }
    return { score, category, tiebreak };
  }

  function bestHand(cards){
    if (cards.length===5) return eval5(cards);
    const combos = combinations(cards,5);
    let best=null;
    for (const c of combos){ const r=eval5(c); if (!best || r.score>best.score) best=r; }
    return best;
  }

  function categoryName(category, tb){
    switch(category){
      case 8: return tb[0]===14 ? 'Escalera Real de Color' : 'Escalera de Color a '+RANK_LABEL(tb[0]);
      case 7: return 'Póker de '+RANK_PLURAL[tb[0]];
      case 6: return 'Full de '+RANK_PLURAL[tb[0]]+' sobre '+RANK_PLURAL[tb[1]];
      case 5: return 'Color';
      case 4: return 'Escalera a '+RANK_LABEL(tb[0]);
      case 3: return 'Trío de '+RANK_PLURAL[tb[0]];
      case 2: return 'Doble pareja: '+RANK_PLURAL[tb[0]]+' y '+RANK_PLURAL[tb[1]];
      case 1: return 'Pareja de '+RANK_PLURAL[tb[0]];
      default: return 'Carta alta: '+RANK_LABEL(tb[0]);
    }
  }

  // Cuenta las cartas que, al caer, mejoran la categoría de tu mano actual
  // (p.ej. de proyecto de color a color hecho). Solo tiene sentido en flop/turn.
  // Una carta solo es "out" si mejora TU jugada por encima de lo que mejora la
  // mesa: si solo empareja la mesa (y le sirve igual a todos) no cuenta.
  function findOuts(holeCards, filledBoard){
    if (filledBoard.length !== 3 && filledBoard.length !== 4) return null;
    const known = [...holeCards, ...filledBoard];
    const before = bestHand(known).category - boardCategory(filledBoard);
    return remainingDeck(known).filter(c => {
      const next = [...filledBoard, c];
      return bestHand([...known, c]).category - boardCategory(next) > before;
    });
  }
  // Categoría de la jugada que forma la mesa sola (4 o 5 cartas).
  function boardCategory(cards){
    if (cards.length >= 5) return bestHand(cards).category;
    const counts = {};
    cards.forEach(c => { counts[c.rank] = (counts[c.rank] || 0) + 1; });
    const v = Object.values(counts).sort((a, b) => b - a);
    if (v[0] === 4) return 7;
    if (v[0] === 3) return 3;
    if (v[0] === 2 && v[1] === 2) return 2;
    if (v[0] === 2) return 1;
    return 0;
  }

  function fullDeck(){ const d=[]; for (const s of SUITS) for (const r of RANKS) d.push({rank:r,suit:s}); return d; }
  function remainingDeck(used){ const usedKeys = new Set(used.map(cardKey)); return fullDeck().filter(c=>!usedKeys.has(cardKey(c))); }
  function drawN(deck, n){
    const arr = deck.slice(); const res = [];
    for (let i=0;i<n;i++){
      const idx = i + Math.floor(Math.random()*(arr.length-i));
      const tmp = arr[i]; arr[i]=arr[idx]; arr[idx]=tmp;
      res.push(arr[i]);
    }
    return res;
  }

  // Simula la mano muchas veces. Si hay rango del rival, sus cartas salen de
  // ese rango (quitando las que ya están a la vista); si no, al azar.
  function runEquity(holeCards, boardCards, rivals, iterations, range){
    const filledBoard = boardCards.filter(Boolean);
    const known = [...holeCards, ...filledBoard];
    const knownKeys = new Set(known.map(cardKey));
    const deck = remainingDeck(known);
    const boardNeeded = 5 - filledBoard.length;
    let pool = null;
    const combos = range instanceof Set
      ? (range.size > 0 && range.size < 169 ? poolFromSet(range) : null)
      : (Array.isArray(range) && range.length > 0 && range.length < 1326 ? range : null);
    if (combos){
      pool = combos.filter(c => !knownKeys.has(cardKey(c[0])) && !knownKeys.has(cardKey(c[1])));
      if (!pool.length) pool = null;
    }
    const cats = new Array(9).fill(0);
    let equitySum = 0, tieSum = 0;
    for (let i=0;i<iterations;i++){
      let fb; const rivalHands = [];
      if (!pool){
        const drawn = drawN(deck, boardNeeded + rivals*2);
        fb = [...filledBoard, ...drawn.slice(0, boardNeeded)];
        for (let o=0;o<rivals;o++) rivalHands.push([drawn[boardNeeded+2*o], drawn[boardNeeded+2*o+1]]);
      } else {
        const used = new Set();
        for (let o=0;o<rivals;o++){
          let hand = null;
          for (let t=0; t<40 && !hand; t++){
            const c = pool[Math.floor(Math.random()*pool.length)];
            if (!used.has(cardKey(c[0])) && !used.has(cardKey(c[1]))) hand = c;
          }
          if (!hand) hand = drawN(deck.filter(c => !used.has(cardKey(c))), 2);
          used.add(cardKey(hand[0])); used.add(cardKey(hand[1]));
          rivalHands.push(hand);
        }
        fb = [...filledBoard, ...drawN(deck.filter(c => !used.has(cardKey(c))), boardNeeded)];
      }
      const mine = bestHand([...holeCards, ...fb]);
      cats[mine.category]++;
      let max = mine.score, winners = 1;
      for (const h of rivalHands){
        const sc = bestHand([...h, ...fb]).score;
        if (sc > max){ max = sc; winners = 1; } else if (sc === max) winners++;
      }
      if (mine.score === max){ if (winners > 1) tieSum += 1/winners; else equitySum += 1; }
    }
    return {
      win: (equitySum/iterations)*100, tie: (tieSum/iterations)*100,
      cats: cats.map(c => c/iterations*100), usedRange: !!pool
    };
  }

  // ---- Modo Fácil / Pro ----
  function setMode(m){
    const pro = m === 'pro';
    document.body.classList.toggle('mode-pro', pro);
    storageSet('rio_mode', pro ? 'pro' : 'facil');
    document.querySelectorAll('.mode-switch button').forEach(b => b.classList.toggle('active', b.dataset.mode === (pro ? 'pro' : 'facil')));
    document.getElementById('modeNote').innerHTML = pro
      ? '<span class="mn-long"><b>Modo Avanzado:</b> rango del rival, stacks, EV, SPR y todas las estadísticas.</span><span class="mn-short">Rango del rival, stacks, EV y SPR</span>'
      : '<span class="mn-long"><b>Modo Fácil:</b> te lo explicamos en palabras sencillas. Toca los <b>?</b> para aprender cada término.</span><span class="mn-short">Todo explicado en palabras sencillas</span>';
  }
  document.querySelectorAll('.mode-switch button').forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));
  setMode(storageGet('rio_mode', 'facil'));

  // En Fácil, posiciones, rival, secuencia y calle quedan plegados: con cartas, bote
  // y lo que te toca pagar ya se puede analizar (se usan valores por defecto).
  function setEasyMore(on, remember){
    document.body.classList.toggle('easy-more', on);
    document.getElementById('moreToggle').innerHTML = on
      ? '▲ Ocultar detalles avanzados'
      : '⚙️ Ajustar detalles avanzados<small>Cómo juega tu rival, cuántos rivales, cash o torneo y secuencia de apuestas. No hace falta para analizar.</small>';
    if (remember) { try { localStorage.setItem('rio_easy_more', on ? '1' : '0'); } catch (e) {} }
  }
  let easyMoreSaved = false;
  try { easyMoreSaved = localStorage.getItem('rio_easy_more') === '1'; } catch (e) {}
  setEasyMore(easyMoreSaved);
  document.getElementById('moreToggle').addEventListener('click', () => setEasyMore(!document.body.classList.contains('easy-more'), true));
  // En Pro: modo rápido (bote y lo que pagas) o completo (secuencia, stacks, SPR).
  function setBetsFull(on, remember){
    document.body.classList.toggle('bets-full', on);
    document.querySelectorAll('#betsMode [data-bm]').forEach(b => b.classList.toggle('active', (b.dataset.bm === 'full') === on));
    if (remember) { try { localStorage.setItem('rio_bets_full', on ? '1' : '0'); } catch (e) {} }
  }
  let betsFullSaved = false;
  try { betsFullSaved = localStorage.getItem('rio_bets_full') === '1'; } catch (e) {}
  setBetsFull(betsFullSaved);
  document.querySelectorAll('#betsMode [data-bm]').forEach(b => b.addEventListener('click', () => setBetsFull(b.dataset.bm === 'full', true)));
  document.getElementById('moreNudgeAdd').addEventListener('click', () => {
    setEasyMore(true, true);
    document.getElementById('tablePanel').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  document.getElementById('moreNudgePro').addEventListener('click', () => {
    setMode('pro');
    document.getElementById('tablePanel').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  const DECISION_ES = { RAISE:'SUBE', CALL:'PAGA', FOLD:'TIRA', CHECK:'PASA', BET:'APUESTA' };
  function decisionHTML(t){ return `<span class="easy-only">${DECISION_ES[t] || t}</span><span class="pro-only">${t}</span>`; }

  // ---- Rangos de manos ----
  // Las 169 manos iniciales ordenadas de mejor a peor (por su probabilidad de
  // ganar contra una mano al azar). "Top 20%" = las primeras manos de la lista
  // hasta sumar el 20% de las 1.326 combinaciones posibles.
  const HAND_RANKING = 'AA KK QQ JJ TT 99 88 AKs 77 AQs AKo AJs AQo ATs AJo 66 KQs ATo A9s KJs A8s KTs 55 A9o KQo A7s KJo K9s A5s A6s A8o QJs QTs KTo A4s A7o K8s QJo A3s A2s Q9s K9o A5o A6o K7s QTo JTs 44 K6s K8o A3o A4o K5s Q8s J9s Q9o JTo K4s K7o A2o K6o Q7s J8s K3s 33 Q8o T9s Q6s K5o K2s J9o K4o Q5s J7s T8s T9o Q4s Q7o J8o K3o Q3s J6s T7s Q6o 98s K2o Q2s 22 Q5o T8o J5s 97s J7o T6s J4s Q4o Q3o 98o T7o J3s 87s 96s Q2o J5o J6o J2s T5s 97o 95s 86s T3s T4s T6o J4o 76s J3o 87o 85s T2s 96o T5o J2o 94s 75s T4o 93s 65s 92s 95o T3o 86o 84s 76o T2o 85o 74s 83s 64s 54s 94o 93o 75o 82s 65o 63s 73s 84o 53s 92o 74o 54o 43s 62s 64o 72s 83o 52s 42s 53o 73o 63o 82o 32s 43o 52o 72o 62o 42o 32o'.split(' ');
  const RANK_CHARS = 'AKQJT98765432';
  const CLASS_COMBOS = n => n.length === 2 ? 6 : (n[2] === 's' ? 4 : 12);
  // Rangos de apertura típicos por posición (aprox., mesa de 6).
  const RANGE_PRESETS = [ ['UTG',15], ['HJ',19], ['CO',27], ['BTN',45], ['SB',40], ['BB',60] ];
  function topRange(pct){
    if (pct >= 100) return new Set(HAND_RANKING);
    const target = pct / 100 * 1326, set = new Set();
    let sum = 0;
    for (const n of HAND_RANKING){ if (sum >= target) break; set.add(n); sum += CLASS_COMBOS(n); }
    return set;
  }
  function rangePct(set){ let sum = 0; set.forEach(n => { sum += CLASS_COMBOS(n); }); return sum / 1326 * 100; }
  function handClass(a, b){
    const L = r => RANK_CHARS[14 - r];
    if (a.rank === b.rank) return L(a.rank) + L(a.rank);
    const hi = a.rank > b.rank ? a : b, lo = hi === a ? b : a;
    return L(hi.rank) + L(lo.rank) + (a.suit === b.suit ? 's' : 'o');
  }
  // Porcentaje de manos iniciales que son iguales o mejores que esta.
  function handTopPercent(a, b){
    const cls = handClass(a, b);
    let sum = 0;
    for (const n of HAND_RANKING){ sum += CLASS_COMBOS(n); if (n === cls) break; }
    return sum / 1326 * 100;
  }
  function strengthTag(top){
    if (top <= 15) return '<span class="strength-tag ok">Muy fuerte · top ' + Math.max(1, Math.round(top)) + '%</span>';
    if (top <= 40) return '<span class="strength-tag warn">Jugable · top ' + Math.round(top) + '%</span>';
    return '<span class="strength-tag no">Débil · top ' + Math.round(top) + '%</span>';
  }
  function classCombos(n){
    const r1 = 14 - RANK_CHARS.indexOf(n[0]), r2 = 14 - RANK_CHARS.indexOf(n[1]);
    const out = [];
    for (const s1 of SUITS) for (const s2 of SUITS){
      const ok = n.length === 2 ? s1 < s2 : (n[2] === 's' ? s1 === s2 : s1 !== s2);
      if (ok) out.push([{rank:r1, suit:s1}, {rank:r2, suit:s2}]);
    }
    return out;
  }

  let villRange;
  (function loadRange(){
    const saved = storageGet('rio_range', null);
    if (saved && Array.isArray(saved.custom)){
      const set = new Set(saved.custom.filter(n => HAND_RANKING.includes(n)));
      villRange = { set, pct: rangePct(set), custom: true };
    } else {
      const pct = saved && saved.pct ? Math.max(2, Math.min(100, saved.pct)) : 40;
      villRange = { set: topRange(pct), pct, custom: false, unknown: !saved || !!saved.unknown };
    }
  })();
  function saveRange(){ storageSet('rio_range', { pct: villRange.pct, custom: villRange.custom ? [...villRange.set] : null, unknown: !!villRange.unknown }); }
  function setRangePct(pct, unknown){ villRange = { set: topRange(pct), pct, custom: false, unknown: !!unknown }; saveRange(); renderRangeUI(); }
  function toggleRangeClass(n){
    const set = new Set(villRange.set);
    if (set.has(n)) set.delete(n); else set.add(n);
    villRange = { set, pct: rangePct(set), custom: true };
    saveRange(); renderRangeUI();
  }
  function rangeLabel(){
    if (villRange.set.size >= 169 || villRange.set.size === 0) return 'Cualquier mano';
    return 'Top ' + Math.round(villRange.pct) + '%' + (villRange.custom ? ' (personalizado)' : '');
  }

  const rangeGrid = document.getElementById('rangeGrid');
  for (let i = 0; i < 13; i++) for (let j = 0; j < 13; j++){
    const n = i === j ? RANK_CHARS[i] + RANK_CHARS[j] : i < j ? RANK_CHARS[i] + RANK_CHARS[j] + 's' : RANK_CHARS[j] + RANK_CHARS[i] + 'o';
    const b = document.createElement('button');
    b.type = 'button'; b.textContent = n; b.dataset.n = n;
    if (i === j) b.classList.add('pair');
    b.addEventListener('click', () => toggleRangeClass(n));
    rangeGrid.appendChild(b);
  }
  const rangePresets = document.getElementById('rangePresets');
  RANGE_PRESETS.concat([['Todas', 100]]).forEach(([pos, pct]) => {
    const b = document.createElement('button');
    b.type = 'button'; b.dataset.pct = pct;
    b.textContent = pos === 'Todas' ? 'Todas (100%)' : `${pos} · ${pct}%`;
    b.title = pos === 'Todas' ? 'Cualquier mano' : `Rango típico de apertura desde ${pos}`;
    b.addEventListener('click', () => setRangePct(pct));
    rangePresets.appendChild(b);
  });
  document.getElementById('rangeSlider').addEventListener('input', (e) => setRangePct(Number(e.target.value)));
  document.querySelectorAll('#rangeChips [data-range]').forEach(b => b.addEventListener('click', () => setRangePct(Number(b.dataset.range), !!b.dataset.unknown)));

  function renderRangeUI(){
    const pct = Math.round(villRange.pct);
    document.getElementById('rangeSlider').value = pct;
    document.getElementById('rangePctLabel').textContent = pct + '%';
    const unknown = !villRange.custom && !!villRange.unknown;
    document.querySelectorAll('#rangeChips [data-range]').forEach(b => b.classList.toggle('active', !villRange.custom && Number(b.dataset.range) === villRange.pct && !!b.dataset.unknown === unknown));
    // Qué cambia realmente según cómo juegue el rival.
    document.getElementById('rangeExplain').innerHTML = villRange.custom ? ''
      : unknown ? '<b>Rival medio:</b> juega unas 4 de cada 10 manos y farolea lo normal. Es la mejor opción si no lo conoces.'
      : villRange.pct >= 100 ? '<b>Juega casi todo:</b> tiene muchas manos flojas, así que tus manos medias ganan más a menudo y compensa más pagar y apostar por valor.'
      : villRange.pct <= 15 ? '<b>Solo manos buenas:</b> si está en la mano, suele llevar algo fuerte. Tus manos medias valen menos: paga menos y no te enamores de una pareja.'
      : '<b>Normal:</b> juega unas 4 de cada 10 manos, las decentes. RÍO equilibra pagar, apostar y retirarse.';
    rangePresets.querySelectorAll('button').forEach(b => b.classList.toggle('active', !villRange.custom && Number(b.dataset.pct) === villRange.pct));
    const heroCls = hole[0] && hole[1] ? handClass(hole[0], hole[1]) : null;
    rangeGrid.querySelectorAll('button').forEach(b => {
      b.classList.toggle('in', villRange.set.has(b.dataset.n));
      b.classList.toggle('hero', b.dataset.n === heroCls);
    });
  }

  // ---- Ayuda y glosario ----
  const HELP = {
    street: ['¿Qué decisión analizar?', 'Elige la calle cuya decisión quieres ver. Puedes meter la mano entera (hasta el river) y luego tocar <b>Flop</b> para ver qué convenía hacer en el flop, <b>Turn</b> para el turn, etc.<br><br>Si has apuntado la <b>secuencia de apuestas</b>, en cada calle se tiene en cuenta todo lo que pasó antes: no es lo mismo que el rival apueste en el river después de subir preflop y apostar flop y turn, que después de pasar en todas las calles.'],
    game: ['Cash o torneo', '<b>Cash:</b> las fichas son dinero; si pierdes, recompras. <b>Torneo:</b> si pierdes todas tus fichas, quedas eliminado, así que jugarte buena parte del stack exige algo más de ventaja. En torneo, escribe tu stack para que lo tengamos en cuenta.'],
    bluffs: ['¿Cuánto farolea?', 'Cuando tu rival apuesta, a veces lo hace con manos flojas para que te retires: es un <b>farol</b>. Si farolea mucho, pagar con manos medias compensa más; si casi nunca farolea, respeta más sus apuestas.'],
    blinds: ['Ciega grande', 'La apuesta obligatoria más grande de la mesa (por ejemplo, en una partida 1/2 la ciega grande es 2). La usamos para calcular el bote inicial del preflop: ciega pequeña + ciega grande.'],
    rivals: ['Rivales en la mano', 'Cuántos jugadores <b>siguen en la mano</b> contigo (no cuentes los que ya se han retirado). Cuantos más rivales, más difícil es ganar.'],
    pot: ['Bote', 'Todas las fichas que hay en el centro de la mesa <b>antes</b> de que tú pagues, incluida la apuesta de tu rival.', 'Ejemplo: había 40 en el centro y tu rival apuesta 20 → el bote es 60.'],
    call: ['Cantidad a igualar', 'Lo que te cuesta <b>pagar</b> para seguir en la mano. Si nadie ha apostado, pon 0.'],
    stack: ['Stack efectivo', 'Las fichas que te quedan delante. El <b>efectivo</b> es el menor entre el tuyo y el de tu rival: es lo máximo que podéis jugaros entre los dos.'],
    position: ['Posición', 'El orden en que habláis. Hablar <b>después</b> que tu rival es una ventaja, porque ves lo que hace antes de decidir.<br><br><b>BTN</b> (botón) es la mejor posición; <b>SB</b> y <b>BB</b> (ciegas) hablan primero después del flop.'],
    range: ['Rango del rival', 'Las manos que tu rival <b>podría tener</b>. No sabes sus cartas, pero sí cómo juega: un jugador que solo entra con manos buenas tiene un rango estrecho (por ejemplo, top 15%), uno que juega casi todo tiene un rango amplio.<br><br>Calcular contra un rango realista da consejos mucho más fiables que contra una mano al azar.'],
    equity: ['Probabilidad de ganar (equity)', 'El porcentaje de veces que tu mano acabaría ganando si la situación se repitiera muchas veces, contra las manos que puede tener tu rival.'],
    tie: ['Empate', 'Las veces que tu mano y la de un rival acaban exactamente igual y os repartís el bote.'],
    lose: ['Probabilidad de perder', 'El porcentaje de veces que un rival acabaría con mejor mano que tú.'],
    needed: ['Lo que necesitas ganar (odds del bote)', 'El mínimo de veces que tienes que ganar para que <b>pagar compense a la larga</b>. Se calcula como lo que pagas dividido entre el bote final.', 'Ejemplo: pagas 20 para ganar un bote de 60 → 20 / (60 + 20) = 25%. Si ganas más del 25% de las veces, pagar es rentable.'],
    outs: ['Outs', 'Las cartas que, si salen en la próxima calle, <b>mejoran tu jugada</b> (por ejemplo, de proyecto de color a color).', 'Truco rápido: en el flop, outs × 4 ≈ % de ligar hasta el river; en el turn, outs × 2.'],
    ratio: ['Ratio del bote', 'Cuántas fichas hay en el bote por cada ficha que pagas. Un 3 : 1 significa que arriesgas 1 para ganar 3.'],
    ev: ['EV (valor esperado)', 'Lo que ganas o pierdes <b>de media</b> cada vez que pagas en esta situación. Positivo (+) = pagar gana dinero a la larga; negativo (−) = lo pierde.'],
    spr: ['SPR', 'Stack efectivo dividido entre el bote. Con SPR bajo (menos de 3) estás casi comprometido y una pareja buena suele bastar para ir all-in; con SPR alto (más de 10) necesitas manos más fuertes para jugarte todo.']
  };
  const helpModal = document.getElementById('helpModal');
  function openHelp(key){
    const h = HELP[key]; if (!h) return;
    document.getElementById('helpTitle').textContent = h[0];
    document.getElementById('helpBody').innerHTML = h[1] + (h[2] ? `<div class="example">${h[2]}</div>` : '');
    helpModal.classList.add('show');
  }
  function openGlossary(){
    document.getElementById('helpTitle').textContent = 'Glosario de póker';
    document.getElementById('helpBody').innerHTML = '<p><a href="/glosario/" target="_blank" rel="noopener"><b>Ver el glosario completo, con ejemplos →</b></a></p>' +
      Object.values(HELP).map(h => `<p><b>${h[0]}</b><br>${h[1]}</p>`).join('');
    helpModal.classList.add('show');
  }
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-help]');
    if (!el) return;
    e.preventDefault();
    openHelp(el.dataset.help);
  });
  document.getElementById('closeHelp').addEventListener('click', () => helpModal.classList.remove('show'));
  helpModal.addEventListener('click', (e) => { if (e.target === helpModal) helpModal.classList.remove('show'); });

  // ---- Secuencia de apuestas ----
  // Mano a dos: "hero" (tú) contra "vill" (el rival que apuesta). Cada calle
  // guarda sus acciones; "to" es lo que ese jugador lleva puesto en la calle
  // después de apostar o subir.
  const STREET_NAMES = ['Preflop', 'Flop', 'Turn', 'River'];
  const PREFLOP_ORDER = ['UTG','HJ','CO','BTN','SB','BB'];
  let seq = [[], [], [], []];
  let seqStreet = 0, seqActor = null, seqPending = null; // seqPending: 'bet' | 'raise' mientras se escribe la cantidad

  const fmtN = (n) => (Math.round(n * 100) / 100).toLocaleString('es-ES');
  function bbSize(){ return Math.max(0.01, Number(document.getElementById('bbInput').value) || 2); }
  // Calles que tienen sus cartas puestas (1 = solo preflop … 4 = hasta el river).
  function cardStreets(){
    const n = board.filter(Boolean).length;
    return n >= 5 ? 4 : n >= 4 ? 3 : n >= 3 ? 2 : 1;
  }
  // Calle cuya decisión se analiza: la que elijas, o la última con cartas.
  let selStreet = null;
  function analysisStreet(){ return selStreet === null ? cardStreets() - 1 : selStreet; }
  function availableStreets(){ return Math.min(cardStreets(), analysisStreet() + 1); }
  // Momento de la decisión en esa calle: si tu última acción ya está apuntada
  // (o la calle ya terminó), analizamos esa decisión tuya; si no, la de ahora.
  function decisionPoint(){
    const s = availableStreets() - 1, list = seq[s];
    const past = s < cardStreets() - 1;
    const last = list[list.length - 1];
    if (!list.length || (!past && last.who !== 'hero')) return null;
    for (let i = list.length - 1; i >= 0; i--) if (list[i].who === 'hero') return { s, i };
    return null;
  }
  function boardAt(s){ return s === 0 ? [] : board.slice(0, s === 1 ? 3 : s === 2 ? 4 : 5).filter(Boolean); }
  function seqHasActions(){ const a = cardStreets(); return seq.slice(0, a).some(x => x.length); }

  // Reproduce la secuencia hasta la calle "upto" (incluida) o hasta justo antes
  // de la acción stopAt = {s, i}. Devuelve bote y lo que lleva cada uno en la calle.
  function replay(upto, stopAt){
    const bb = bbSize(), sb = bb / 2;
    const heroPos = document.getElementById('heroPosInput').value;
    const villPos = document.getElementById('villPosInput').value;
    let pot = sb + bb;
    let heroIn = heroPos === 'BB' ? bb : heroPos === 'SB' ? sb : 0;
    let villIn = villPos === 'BB' ? bb : villPos === 'SB' ? sb : 0;
    let raises = 0;
    // Preflop, aunque ni tú ni el rival seáis la ciega grande, para entrar hay que
    // poner al menos la ciega grande: "floor" es lo mínimo que hay que igualar.
    const out = (s) => {
      const floor = s === 0 ? bb : 0;
      return { pot, heroIn, villIn, raises,
        owed: Math.max(0, Math.max(villIn, floor) - heroIn), villOwed: Math.max(0, Math.max(heroIn, floor) - villIn) };
    };
    for (let s = 0; s <= upto; s++){
      if (s > 0){ heroIn = 0; villIn = 0; }
      for (let i = 0; i < seq[s].length; i++){
        if (stopAt && stopAt.s === s && stopAt.i === i) return out(s);
        const a = seq[s][i];
        const mine = a.who === 'hero' ? heroIn : villIn;
        const other = Math.max(a.who === 'hero' ? villIn : heroIn, s === 0 ? bb : 0);
        if (s === 0 && (a.type === 'bet' || a.type === 'raise')) raises++;
        let add = 0;
        if (a.type === 'call') add = Math.max(0, other - mine);
        else if (a.type === 'bet' || a.type === 'raise') add = Math.max(0, a.to - mine);
        pot += add;
        if (a.who === 'hero') heroIn += add; else villIn += add;
      }
      if (stopAt && stopAt.s === s) return out(s);
    }
    return out(upto);
  }

  function defaultActor(s){
    const list = seq[s];
    if (list.length) return list[list.length - 1].who === 'hero' ? 'vill' : 'hero';
    if (s === 0){
      const h = PREFLOP_ORDER.indexOf(document.getElementById('heroPosInput').value);
      const v = PREFLOP_ORDER.indexOf(document.getElementById('villPosInput').value);
      return h < v ? 'hero' : 'vill';
    }
    return heroIsOOP() ? 'hero' : 'vill';
  }

  function actionText(a, amount){
    const who = a.who === 'hero' ? 'Tú' : 'Rival';
    const verb = {
      check: 'pasa', fold: a.who === 'hero' ? 'te retiras' : 'se retira',
      call: 'paga ' + fmtN(amount), bet: 'apuesta ' + fmtN(a.to), raise: 'sube a ' + fmtN(a.to)
    }[a.type];
    return `<span class="who">${who}</span>${verb}`;
  }

  function renderSeq(){
    const avail = cardStreets();
    if (seqStreet >= avail) seqStreet = avail - 1;
    const tabs = document.getElementById('seqTabs');
    tabs.innerHTML = STREET_NAMES.map((n, s) => {
      const count = seq[s].length;
      return `<button type="button" data-s="${s}" class="${s === seqStreet ? 'active' : ''}" ${s >= avail ? 'disabled title="Añade primero las cartas de esta calle"' : ''}>${n}<small>${s >= avail ? 'sin cartas' : count ? (count === 1 ? '1 acción' : count + ' acciones') : '—'}</small></button>`;
    }).join('');
    tabs.querySelectorAll('button').forEach(b => b.addEventListener('click', () => { seqStreet = Number(b.dataset.s); seqActor = null; seqPending = null; renderSeq(); }));

    // Lista de acciones de la calle elegida
    const start = replay(seqStreet, { s: seqStreet, i: 0 });
    const chips = [];
    for (let i = 0; i < seq[seqStreet].length; i++){
      const st = replay(seqStreet, { s: seqStreet, i });
      const a = seq[seqStreet][i];
      const amount = a.type === 'call' ? (a.who === 'hero' ? st.owed : st.villOwed) : 0;
      chips.push(`<span class="seq-chip ${a.who}">${actionText(a, amount)}</span>`);
    }
    document.getElementById('seqList').innerHTML = `<span>Bote: <b>${fmtN(start.pot)}</b></span>` + (chips.length ? chips.join('') : '<span>Aún no hay acciones en esta calle.</span>');

    // Controles para añadir la siguiente acción
    const actor = seqActor || defaultActor(seqStreet);
    const now = replay(seqStreet);
    const mine = actor === 'hero' ? now.heroIn : now.villIn;
    const toCall = actor === 'hero' ? now.owed : now.villOwed;
    const other = mine + toCall;
    const facingBet = toCall > 0;
    const pendingType = facingBet ? 'raise' : 'bet';
    const potNow = now.pot;
    const sizes = facingBet
      ? [['x2,5', other * 2.5], ['x3', other * 3], ['x4', other * 4]]
      : [['1/3 bote', potNow / 3], ['1/2 bote', potNow / 2], ['2/3 bote', potNow * 2 / 3], ['Bote', potNow]];
    const ctl = document.getElementById('seqControls');
    ctl.innerHTML = `
      <div class="seq-who">
        <button type="button" data-who="hero" class="${actor === 'hero' ? 'active' : ''}">🙋 Tú</button>
        <button type="button" data-who="vill" class="${actor === 'vill' ? 'active' : ''}">🎯 Rival</button>
      </div>
      <div class="seq-state">${actor === 'hero'
        ? (facingBet ? `Tienes que pagar <b>${fmtN(toCall)}</b>. ¿Qué hiciste?` : 'Puedes pasar o apostar. ¿Qué hiciste?')
        : (facingBet ? `El rival tiene que pagar <b>${fmtN(toCall)}</b>. ¿Qué hizo?` : 'El rival puede pasar o apostar. ¿Qué hizo?')}</div>
      <div class="seq-acts">
        ${facingBet
          ? `<button type="button" class="fold" data-act="fold">Retirarse</button><button type="button" data-act="call">Pagar ${fmtN(toCall)}</button><button type="button" class="aggr" data-act="raise">Subir…</button>`
          : `<button type="button" data-act="check">Pasar</button><button type="button" class="aggr" data-act="bet">Apostar…</button><button type="button" class="fold" data-act="fold">Retirarse</button>`}
      </div>
      <div class="seq-amount ${seqPending ? 'show' : ''}">
        <input type="number" id="seqAmount" min="0" step="any" inputmode="decimal" placeholder="${facingBet ? 'Sube a… (total)' : 'Cantidad'}">
        <button type="button" id="seqAmountOk">Añadir</button>
      </div>
      ${seqPending ? `<div class="seq-sizes">${sizes.map(([l, v]) => `<button type="button" data-size="${Math.round(v * 100) / 100}">${l} · ${fmtN(Math.round(v * 100) / 100)}</button>`).join('')}</div>` : ''}`;
    ctl.querySelectorAll('[data-who]').forEach(b => b.addEventListener('click', () => { seqActor = b.dataset.who; seqPending = null; renderSeq(); }));
    ctl.querySelectorAll('[data-act]').forEach(b => b.addEventListener('click', () => {
      const act = b.dataset.act;
      if (act === 'bet' || act === 'raise'){ seqPending = pendingType; renderSeq(); document.getElementById('seqAmount').focus(); return; }
      addSeqAction({ who: actor, type: act });
    }));
    const addAmount = (v) => {
      const to = Number(v);
      if (!(to > other)){ const inp = document.getElementById('seqAmount'); inp.value = ''; inp.placeholder = `Tiene que ser más de ${fmtN(other)}`; inp.focus(); return; }
      addSeqAction({ who: actor, type: facingBet ? 'raise' : 'bet', to });
    };
    ctl.querySelectorAll('[data-size]').forEach(b => b.addEventListener('click', () => addAmount(b.dataset.size)));
    const ok = document.getElementById('seqAmountOk');
    if (ok) ok.addEventListener('click', () => addAmount(document.getElementById('seqAmount').value));
    const amt = document.getElementById('seqAmount');
    if (amt) amt.addEventListener('keydown', (e) => { if (e.key === 'Enter') addAmount(amt.value); });
  }

  function addSeqAction(a){
    seq[seqStreet].push(a);
    seqActor = null; seqPending = null;
    renderSeq(); syncFromSeq();
  }
  document.getElementById('seqUndo').addEventListener('click', () => {
    for (let s = seqStreet; s >= 0; s--){ if (seq[s].length){ seq[s].pop(); seqStreet = s; break; } }
    seqActor = null; seqPending = null; renderSeq(); syncFromSeq();
  });
  document.getElementById('seqClear').addEventListener('click', () => {
    seq = [[], [], [], []]; seqStreet = 0; seqActor = null; seqPending = null; renderSeq(); syncFromSeq();
  });
  document.getElementById('bbInput').addEventListener('input', () => { renderSeq(); syncFromSeq(); });

  // Con secuencia, el bote y lo que te toca pagar se calculan solos.
  function syncFromSeq(){
    const potEl = document.getElementById('potInput'), callEl = document.getElementById('callInput');
    const has = seqHasActions();
    potEl.classList.toggle('auto', has); callEl.classList.toggle('auto', has);
    if (!has){ easyPotFromMain(); return; }
    // Si hay secuencia (relato, captura, mano compartida…), que se vea también en Fácil.
    if (!document.body.classList.contains('easy-more')) setEasyMore(true);
    if (!document.body.classList.contains('bets-full')) setBetsFull(true);
    const dp = decisionPoint();
    const st = replay(availableStreets() - 1, dp || undefined);
    potEl.value = Math.round(st.pot * 100) / 100;
    callEl.value = Math.round(st.owed * 100) / 100;
    easyPotFromMain();
  }

  // ---- Selector de calle a analizar ----
  function renderStreetBtns(){
    const cs = cardStreets(), a = analysisStreet();
    const need = ['', 'faltan 3 cartas', 'falta 1 carta', 'falta 1 carta'];
    document.getElementById('streetBtns').innerHTML = STREET_NAMES.map((n, i) =>
      `<button type="button" data-s="${i}" class="${i === a ? 'active' : ''} ${i >= cs ? 'missing' : ''}">${n}<small>${i === a ? 'analizando' : i >= cs ? need[i] : 'ver'}</small></button>`).join('');
    document.querySelectorAll('.board-groups > div').forEach((g, i) => g.classList.toggle('later', i + 1 > a));
  }
  function selectStreet(s){
    selStreet = s === cardStreets() - 1 ? null : s;
    seqStreet = Math.min(s, cardStreets() - 1); seqActor = null; seqPending = null;
    render();
    if (s >= cardStreets()){
      const idx = board.findIndex(c => !c);
      if (idx !== -1) openPicker('board', idx);
    }
  }
  document.getElementById('streetBtns').addEventListener('click', (e) => {
    const b = e.target.closest('[data-s]'); if (b) selectStreet(Number(b.dataset.s));
  });

  // ---- Rango del rival según cómo ha apostado ----
  const DRAW_SCORE = [7,0,0,0,0].reduce((x, t) => x * 15 + t, 1); // un proyecto cuenta como una pareja media
  function hasDraw(combo, boardCards){
    if (boardCards.length >= 5) return false;
    const cards = [...combo, ...boardCards];
    for (const su of SUITS){
      if (cards.filter(c => c.suit === su).length >= 4 && combo.some(c => c.suit === su)) return true;
    }
    const ranks = new Set(cards.map(c => c.rank)); if (ranks.has(14)) ranks.add(1);
    const mine = new Set(combo.map(c => c.rank)); if (mine.has(14)) mine.add(1);
    for (let lo = 1; lo <= 10; lo++){
      let n = 0, usesMine = false;
      for (let r = lo; r < lo + 5; r++){ if (ranks.has(r)){ n++; if (mine.has(r)) usesMine = true; } }
      if (n >= 4 && usesMine) return true;
    }
    return false;
  }
  function comboStrength(combo, boardCards){
    if (boardCards.length < 3) return -HAND_RANKING.indexOf(handClass(combo[0], combo[1]));
    const sc = bestHand([...combo, ...boardCards]).score;
    return hasDraw(combo, boardCards) ? Math.max(sc, DRAW_SCORE) : sc;
  }
  // Se queda con la fracción "frac" más fuerte del rango en esa mesa.
  function strongest(pool, boardCards, frac){
    const blocked = new Set([...hole.filter(Boolean), ...boardCards].map(cardKey));
    const live = pool.filter(c => !blocked.has(cardKey(c[0])) && !blocked.has(cardKey(c[1])));
    if (live.length < 4) return live;
    const scored = live.map(c => [comboStrength(c, boardCards), c]).sort((a, b) => b[0] - a[0]);
    return scored.slice(0, Math.max(3, Math.ceil(scored.length * frac))).map(x => x[1]);
  }
  function poolFromSet(set){ const out = []; set.forEach(n => classCombos(n).forEach(c => out.push(c))); return out; }
  function intersectTop(set, pct){ const top = topRange(pct); return new Set([...set].filter(n => top.has(n))); }
  const OPEN_PCT = Object.fromEntries(RANGE_PRESETS);

  // Rango del rival justo antes de la acción stopAt (o al final de la secuencia).
  function villainPoolAt(stopAt){
    const villPos = document.getElementById('villPosInput').value;
    let set = new Set(villRange.set);
    let raises = 0;
    const avail = availableStreets();
    const pre = seq[0];
    for (let i = 0; i < pre.length; i++){
      if (stopAt && stopAt.s === 0 && stopAt.i === i) break;
      const a = pre[i];
      if (a.type === 'bet' || a.type === 'raise'){
        raises++;
        if (a.who === 'vill') set = intersectTop(set, raises === 1 ? (OPEN_PCT[villPos] || 30) : raises === 2 ? 9 : 4);
      } else if (a.type === 'call' && a.who === 'vill'){
        set = intersectTop(set, raises >= 2 ? 15 : villPos === 'BB' ? 60 : 30);
      }
    }
    // Sin secuencia, antes del flop y con algo más que la ciega por pagar: el rival ha subido,
    // así que no juega todo su rango, solo el de apertura (o el de resubida si la subida es grande).
    if (!pre.length && analysisStreet() === 0){
      const call = Math.max(0, Number(document.getElementById('callInput').value) || 0);
      if (call > bbSize()) set = intersectTop(set, call > bbSize() * 5 ? 9 : Math.min(OPEN_PCT[villPos] || 30, 30));
    }
    if (set.size === 0) set = new Set(villRange.set);
    let pool = poolFromSet(set);
    for (let s = 1; s < avail; s++){
      if (stopAt && stopAt.s < s) break;
      const b = boardAt(s);
      for (let i = 0; i < seq[s].length; i++){
        if (stopAt && stopAt.s === s && stopAt.i === i) break;
        const a = seq[s][i];
        if (a.who !== 'vill') continue;
        if (a.type === 'bet') pool = withBluffs(pool, b, 0.55, bluffFrac());
        else if (a.type === 'raise') pool = withBluffs(pool, b, 0.25, bluffFrac() * 0.7);
        else if (a.type === 'call') pool = strongest(pool, b, 0.7);
      }
    }
    return pool;
  }
  // Rango con el que suele subir o resubir (para el plan "si te suben").
  function raisingPool(pool, s, frac){
    if (s === 0){
      const classes = new Set(pool.map(c => handClass(c[0], c[1])));
      const tight = intersectTop(classes, 9);
      return poolFromSet(tight.size ? tight : classes);
    }
    return withBluffs(pool, boardAt(s), frac, bluffFrac() * 0.4);
  }

  // ---- Decisión recomendada ----
  function decide(win, needed, call, oop, rivals){
    const raiseBuffer = oop ? 8 : 4, callBuffer = oop ? -1 : -5;
    const fairShare = 100 / (rivals + 1);
    if (call === 0) return win >= fairShare + (oop ? 18 : 12) ? { text: 'BET', cls: 'ok' } : { text: 'CHECK', cls: 'warn' };
    if (win >= needed + raiseBuffer) return { text: 'RAISE', cls: 'ok' };
    if (win >= needed + callBuffer) return { text: 'CALL', cls: 'warn' };
    return { text: 'FOLD', cls: 'no' };
  }
  function grade(rec, act){
    if (rec === act) return 'ok';
    const aggr = x => x === 'RAISE' || x === 'BET';
    if (aggr(rec) && (act === 'CALL' || act === 'CHECK')) return 'meh';
    if (rec === 'CALL' && aggr(act)) return 'meh';
    if (rec === 'CHECK' && act === 'BET') return 'meh';
    return 'bad';
  }

  // Repasa cada acción tuya de la secuencia.
  function reviewDecisions(){
    const avail = cardStreets(), rows = [];
    const oop = heroIsOOP();
    const heroPos = document.getElementById('heroPosInput').value, villPos = document.getElementById('villPosInput').value;
    const threeBet = replay(0).raises >= 2; // bote con resubida antes del flop
    const bb = bbSize();
    for (let s = 0; s < avail; s++){
      for (let i = 0; i < seq[s].length; i++){
        const a = seq[s][i];
        if (a.who !== 'hero') continue;
        const st = replay(s, { s, i });
        const toCall = st.owed;
        const pool = villainPoolAt({ s, i });
        const reco = recommend({ heroCards: hole, boardCards: boardAt(s), pot: st.pot, toCall, rivals: numRivals, pool, oop, street: s,
          heroPos: document.getElementById('heroPosInput').value, unraised: s === 0 && st.raises === 0, iters: 700 });
        const win = reco.eq, needed = reco.needed, rec = reco.text;
        const act = a.type === 'check' ? 'CHECK' : a.type === 'call' ? 'CALL' : a.type === 'fold' ? 'FOLD' : (toCall > 0 ? 'RAISE' : 'BET');
        // EV perdido estimado (en ciegas grandes), solo donde RÍO sabe calcular las dos opciones:
        // pagar o tirar, y apostar o pasar. Los errores al subir se cuentan sin cifra.
        let loss = null;
        const evCall = (win / 100) * st.pot - (1 - win / 100) * toCall;
        if (toCall > 0 && (rec === 'CALL' || rec === 'RAISE') && act === 'FOLD') loss = Math.max(0, evCall);
        else if (toCall > 0 && rec === 'FOLD' && act === 'CALL') loss = Math.max(0, -evCall);
        else if (toCall === 0 && reco.bc && rec === 'BET' && act === 'CHECK') loss = Math.max(0, reco.bc.evBet - reco.bc.evCheck);
        else if (toCall === 0 && reco.bc && rec === 'CHECK' && act === 'BET') loss = Math.max(0, reco.bc.evCheck - reco.bc.evBet);
        else if (rec === act) loss = 0;
        rows.push({ s, win, needed, toCall, pot: st.pot, rec, act, g: grade(rec, act),
          pos: `${heroPos} vs ${villPos}`, pt: threeBet && s > 0 ? '3bet' : '', bc: s === 3 && toCall > 0 ? 1 : 0,
          loss: loss === null ? null : Math.round(loss / bb * 10) / 10 });
      }
    }
    return rows;
  }
  function renderTimeline(rows){
    const wrap = document.getElementById('timelineWrap');
    wrap.style.display = rows.length ? 'block' : 'none';
    if (!rows.length) return;
    const of20 = (p) => { const n = Math.round(p / 5); return n === 0 && p > 0 ? 'menos de 1' : String(n); };
    const MARK = { ok: '✓', meh: '≈', bad: '✗' };
    const VERDICT = { ok: 'Bien jugado', meh: 'Aceptable', bad: 'Mejorable' };
    document.getElementById('timeline').innerHTML = rows.map(r => {
      const situation = r.toCall > 0
        ? `Te tocaba pagar <b>${fmtN(r.toCall)}</b> en un bote de <b>${fmtN(r.pot)}</b>.`
        : `Nadie había apostado (bote de <b>${fmtN(r.pot)}</b>).`;
      const easy = `${situation} Ganabas unas <b>${of20(r.win)} de cada 20</b>${r.toCall > 0 ? ` y necesitabas <b>${of20(r.needed)}</b>` : ''}.`;
      const pro = `${situation} Equity <b>${r.win.toFixed(1).replace('.', ',')}%</b>${r.toCall > 0 ? ` · necesitabas <b>${r.needed.toFixed(1).replace('.', ',')}%</b>` : ''}.`;
      return `<div class="tl-row"><div class="tl-mark ${r.g}">${MARK[r.g]}</div><div>
        <div class="tl-head">${STREET_NAMES[r.s]} <small>${VERDICT[r.g]}</small></div>
        <div class="tl-body"><span class="easy-only">${easy}</span><span class="pro-only">${pro}</span><br>
        Hiciste <b>${decisionHTML(r.act)}</b> · lo recomendado era <b>${decisionHTML(r.rec)}</b>.</div></div></div>`;
    }).join('');
  }

  // ---- Recomendación (la usan el análisis, el repaso y el entrenamiento) ----
  // c = { heroCards, boardCards, pot, toCall, rivals, pool, oop, street, heroPos, unraised, premium, eq?, iters? }
  function recommend(c){
    let eq = c.eq;
    if (eq === undefined){ const r = runEquity(c.heroCards, c.boardCards, c.rivals, c.iters || 1000, c.pool); eq = r.win + r.tie / 2; }
    const needed = c.toCall > 0 ? c.toCall / (c.pot + c.toCall) * 100 : 0;
    // Preflop sin subidas: abrir o tirar según la tabla de tu posición.
    if (c.street === 0 && c.unraised && c.heroPos !== 'BB'){
      const top = handTopPercent(c.heroCards[0], c.heroCards[1]);
      return { text: top <= OPEN_PCT[c.heroPos] ? 'RAISE' : 'FOLD', eq, needed, kind: 'open', top };
    }
    // Nadie ha apostado (después del flop): apostar solo si rinde más que pasar.
    if (c.street > 0 && c.toCall === 0){
      const bc = bluffCheck(c.heroCards, c.boardCards, c.pot, c.rivals, c.pool || poolFromSet(topRange(100)), eq);
      if (bc && bc.better) return { text: 'BET', eq, needed, bc, kind: bc.eqCall < 0.5 ? 'bluff' : 'value' };
      return { text: 'CHECK', eq, needed, bc };
    }
    let text = decide(eq, needed + (c.premium || 0), c.toCall, c.oop, c.rivals).text;
    // Antes del flop, pagar exige algo más de lo justo: las manos flojas rara vez aprovechan
    // toda su equity (ligan poco y suelen jugar el resto de la mano en desventaja).
    if (text === 'CALL' && c.street === 0 && eq < needed + 3 + (c.premium || 0)) text = 'FOLD';
    // Para subir hay que ganar a las manos que pagarían la subida, no a todo su rango
    // (también antes del flop: resubir con 7-2 porque el bote paga bien no tiene sentido).
    if (text === 'RAISE'){
      const strong = withBluffs(c.pool || poolFromSet(topRange(100)), c.boardCards, 0.4, 0, c.heroCards);
      const r2 = runEquity(c.heroCards, c.boardCards, c.rivals, 700, strong);
      const vs = r2.win + r2.tie / 2;
      if (vs < 60) return { text: 'CALL', eq, needed, downgraded: true, valueCheck: vs };
      return { text, eq, needed, valueCheck: vs };
    }
    return { text, eq, needed };
  }

  // ---- Faroles ----
  function bluffFrac(){ return Number(document.getElementById('bluffSelect').value) || 0.1; }
  document.getElementById('bluffSelect').value = String(storageGet('rio_bluff', 0.1));
  document.getElementById('bluffSelect').addEventListener('change', (e) => storageSet('rio_bluff', Number(e.target.value)));

  // Cuando el rival apuesta o sube se queda con la parte fuerte de su rango
  // más algunos faroles (sus manos más flojas: proyectos fallados, aire).
  function withBluffs(pool, boardCards, frac, bluff, heroCards){
    const blocked = new Set([...(heroCards || hole).filter(Boolean), ...boardCards].map(cardKey));
    const live = pool.filter(c => !blocked.has(cardKey(c[0])) && !blocked.has(cardKey(c[1])));
    if (live.length < 6) return live;
    const scored = live.map(c => [comboStrength(c, boardCards), c]).sort((a, b) => b[0] - a[0]);
    const top = Math.max(3, Math.ceil(scored.length * frac));
    const keep = scored.slice(0, top);
    const bot = Math.ceil(scored.length * bluff);
    if (bot > 0) keep.push(...scored.slice(Math.max(top, scored.length - bot)));
    return keep.map(x => x[1]);
  }

  // ¿Compensa apostar 2/3 del bote de farol o semifarol en vez de pasar?
  // El rival paga con pareja media o mejor, o con proyecto; el resto se retira.
  function bluffCheck(heroCards, boardCards, pot, rivals, pool, eqNow){
    if (boardCards.length < 3 || pot <= 0 || !pool || !pool.length) return null;
    const blocked = new Set([...heroCards, ...boardCards].map(cardKey));
    const live = pool.filter(c => !blocked.has(cardKey(c[0])) && !blocked.has(cardKey(c[1])));
    if (live.length < 5) return null;
    const callers = live.filter(c => comboStrength(c, boardCards) >= DRAW_SCORE);
    const f = Math.pow(1 - callers.length / live.length, rivals); // tienen que retirarse todos
    const bet = pot * 2 / 3;
    let eqCall = 0;
    if (callers.length){ const r = runEquity(heroCards, boardCards, rivals, 700, callers); eqCall = (r.win + r.tie / 2) / 100; }
    const evBet = f * pot + (1 - f) * (eqCall * (pot + 2 * bet) - bet);
    const evCheck = (eqNow / 100) * pot;
    return { f, bet, eqCall, evBet, evCheck, better: evBet > evCheck + pot * 0.03 };
  }

  // ---- Cash o torneo ----
  function setGame(g){
    storageSet('rio_game', g);
    document.body.classList.toggle('tourney', g === 'torneo');
    document.querySelectorAll('#gameType [data-game]').forEach(b => b.classList.toggle('active', b.dataset.game === g));
  }
  document.querySelectorAll('#gameType [data-game]').forEach(b => b.addEventListener('click', () => setGame(b.dataset.game)));
  setGame(storageGet('rio_game', 'cash'));

  // Las etiquetas Preflop/Flop/Turn/River de la cabecera también eligen la calle.
  ['Preflop','Flop','Turn','River'].forEach((n, i) => ['dot' + n, 'lbl' + n].forEach(id => {
    const el = document.getElementById(id);
    el.style.cursor = 'pointer';
    el.addEventListener('click', () => selectStreet(i));
  }));

  const of20 = (p) => { const n = Math.round(p / 5); return n === 0 && p > 0 ? 'menos de 1' : String(n); };
  const cardHTML = (c, big) => `<span class="mini-card${big ? ' big' : ''}${SUIT_CRIMSON[c.suit] ? ' crimson' : ''}">${RANK_LABEL(c.rank)}<span>${SUIT_SYMBOL[c.suit]}</span></span>`;

  // Ventana genérica (reutiliza la de ayuda)
  function openModal(title, html){
    document.getElementById('helpTitle').textContent = title;
    document.getElementById('helpBody').innerHTML = html;
    helpModal.classList.add('show');
    return document.getElementById('helpBody');
  }
  function closeModal(){ helpModal.classList.remove('show'); }

  // ---- ¿Se juega esta mano desde tu posición? ----
  function openAdvice(a, b){
    const pos = document.getElementById('heroPosInput').value;
    const top = handTopPercent(a, b), lim = pos === 'BB' ? 60 : OPEN_PCT[pos];
    const ok = top <= lim;
    const txt = pos === 'BB'
      ? (ok ? 'Se suele defender desde BB si te suben' : 'Desde BB normalmente se tira si te suben')
      : (ok ? `Se suele abrir (subir) desde ${pos} si nadie ha entrado` : `Desde ${pos} normalmente se tira si nadie ha entrado`);
    return `<div class="pos-advice ${ok ? 'ok' : 'no'}">${ok ? '✓' : '✗'} ${txt} · <a data-open-charts>ver tabla</a></div>`;
  }
  document.getElementById('currentHand').addEventListener('click', (e) => { if (e.target.closest('[data-open-charts]')) openCharts(); });

  // ---- Tablas de manos iniciales ----
  // Tablas orientativas de apertura (defensa en la BB). 6 o 9 jugadores, cash o torneo (unas 40 ciegas o más).
  const CHART_SETS = {
    '6-cash':   [['UTG',15],['HJ',19],['CO',27],['BTN',45],['SB',40],['BB',60]],
    '6-torneo': [['UTG',14],['HJ',18],['CO',26],['BTN',45],['SB',42],['BB',65]],
    '9-cash':   [['UTG',10],['UTG+1',12],['MP',14],['HJ',18],['CO',26],['BTN',43],['SB',38],['BB',55]],
    '9-torneo': [['UTG',9],['UTG+1',11],['MP',13],['HJ',17],['CO',25],['BTN',43],['SB',40],['BB',60]]
  };
  let chartPlayers = '6', chartGame = null;
  function openCharts(pos, players, game){
    if (players) chartPlayers = players;
    chartGame = game || chartGame || (storageGet('rio_game', 'cash') === 'torneo' ? 'torneo' : 'cash');
    const list = CHART_SETS[chartPlayers + '-' + chartGame];
    pos = pos || document.getElementById('heroPosInput').value;
    if (!list.some(([p]) => p === pos)) pos = 'BTN';
    const pct = list.find(([p]) => p === pos)[1];
    const set = topRange(pct);
    const heroCls = hole[0] && hole[1] ? handClass(hole[0], hole[1]) : null;
    let grid = '';
    for (let i = 0; i < 13; i++) for (let j = 0; j < 13; j++){
      const n = i === j ? RANK_CHARS[i] + RANK_CHARS[j] : i < j ? RANK_CHARS[i] + RANK_CHARS[j] + 's' : RANK_CHARS[j] + RANK_CHARS[i] + 'o';
      grid += `<button type="button" tabindex="-1" class="${set.has(n) ? 'in' : ''} ${i === j ? 'pair' : ''} ${n === heroCls ? 'hero' : ''}">${n}</button>`;
    }
    const opt = (attr, v, label, cur) => `<button type="button" data-${attr}="${v}" class="${v === cur ? 'active' : ''}">${label}</button>`;
    const body = openModal('Tablas de manos iniciales', `
      <div class="chart-opts">
        <div class="range-presets">${opt('cp', '6', '6 jugadores', chartPlayers)}${opt('cp', '9', '9 jugadores', chartPlayers)}</div>
        <div class="range-presets">${opt('cg', 'cash', 'Cash', chartGame)}${opt('cg', 'torneo', 'Torneo', chartGame)}</div>
      </div>
      <div class="range-presets">${list.map(([p]) => `<button type="button" data-chart="${p}" class="${p === pos ? 'active' : ''}">${p}</button>`).join('')}</div>
      <p style="margin:0 0 10px;"><b>Tu rango recomendado</b> · ${pos === 'BB'
        ? 'Desde la <b>ciega grande</b>, si alguien sube, puedes <b>defender</b> (pagar o volver a subir) con las manos en rojo: unas ' + pct + '% del total.'
        : `Desde <b>${pos}</b>, si nadie ha entrado antes, <b>sube</b> con las manos en rojo (~${pct}% de las manos) y <b>tira</b> el resto.`}</p>
      <div class="range-grid chart-grid">${grid}</div>
      <p class="hint" style="margin-top:10px;">Diagonal = parejas · arriba = mismo palo (s) · abajo = distinto palo (o).${heroCls ? ' Recuadro verde = tu mano.' : ''}</p>
      <p class="hint">⚠️ Son <b>tablas orientativas</b> (${chartPlayers} jugadores, ${chartGame === 'torneo' ? 'torneo con unas 40 ciegas o más' : 'cash con unas 100 ciegas'}), no una solución para todas las mesas: con stacks cortos, antes grandes o rivales muy agresivos, los rangos cambian. <a href="/tablas/" target="_blank" rel="noopener">Ver todas las tablas →</a></p>`);
    body.querySelectorAll('[data-chart]').forEach(b => b.addEventListener('click', () => openCharts(b.dataset.chart)));
    body.querySelectorAll('[data-cp]').forEach(b => b.addEventListener('click', () => openCharts(pos, b.dataset.cp)));
    body.querySelectorAll('[data-cg]').forEach(b => b.addEventListener('click', () => openCharts(pos, null, b.dataset.cg)));
  }

  // ---- Estadísticas ----
  function handSignature(){ return JSON.stringify([hole, board, seq]); }
  function saveReviews(rows){
    if (!rows.length) return;
    const all = storageGet('rio_reviews', {});
    all[handSignature()] = { t: Date.now(), rows: rows.map(r => ({ s: r.s, rec: r.rec, act: r.act, g: r.g, pos: r.pos, pt: r.pt, bc: r.bc, loss: r.loss })) };
    const keys = Object.keys(all).sort((a, b) => all[b].t - all[a].t).slice(0, 100);
    storageSet('rio_reviews', Object.fromEntries(keys.map(k => [k, all[k]])));
  }
  const LEAKS = {
    'CALL>FOLD': 'Pagas cuando convenía retirarse', 'FOLD>CALL': 'Te retiras cuando convenía pagar',
    'FOLD>RAISE': 'Te retiras con manos para subir', 'CHECK>BET': 'Pasas cuando convenía apostar',
    'CALL>RAISE': 'Pagas cuando convenía subir', 'RAISE>CALL': 'Subes cuando bastaba con pagar',
    'BET>CHECK': 'Apuestas cuando convenía pasar', 'RAISE>FOLD': 'Subes con manos para tirar'
  };
  function openStats(){
    const reviews = Object.values(storageGet('rio_reviews', {}));
    const hand = reviews.flatMap(x => x.rows.map(r => ({ ...r, t: x.t })));
    const train = storageGet('rio_train_log', []);
    const hist = getHistory();
    const all = [...hand, ...train];
    if (!all.length && !hist.length){
      openModal('Tu progreso', `<p>Aún no hay datos. Se llenan de dos formas:</p><ul><li>Analizando tus manos (mejor con la <b>secuencia de apuestas</b> apuntada: así vemos qué hiciste tú).</li><li>Jugando al <b>modo entrenamiento</b>.</li></ul><button type="button" class="btn-primary" id="statsTrain" style="width:100%;">🎯 Empezar a entrenar</button>`)
        .querySelector('#statsTrain').addEventListener('click', openTrainer);
      return;
    }
    const pct = (arr, g) => arr.length ? Math.round(arr.filter(r => r.g === g).length / arr.length * 100) : 0;
    const fmt1 = (v) => (Math.round(v * 10) / 10).toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

    // --- Tu progreso: manos analizadas, EV medio y qué te recomienda RÍO ---
    const evBB = hist.filter(h => typeof h.ev === 'number' && h.evU === 'BB').map(h => h.ev);
    const evAvg = evBB.length ? evBB.reduce((a, b) => a + b, 0) / evBB.length : null;
    const dec = { CALL: 0, RAISE: 0, FOLD: 0, CHECK: 0 };
    hist.forEach(h => { const k = h.decision === 'BET' ? 'RAISE' : h.decision; if (k in dec) dec[k]++; });
    const decTotal = Object.values(dec).reduce((a, b) => a + b, 0) || 1;
    const decRow = (k, label) => `<div class="final-row"><span>${label}</span><div class="bar"><i style="width:${Math.max(dec[k] ? 2 : 0, dec[k] / decTotal * 100)}%"></i></div><b>${Math.round(dec[k] / decTotal * 100)}%</b></div>`;

    // --- Dónde pierdes más EV (estimado): agrupado por enfrentamiento, calle, bote con resubida y pagar en el river ---
    const errs = hand.filter(r => r.g !== 'ok');
    const withLoss = errs.filter(r => typeof r.loss === 'number' && r.loss > 0);
    const groups = {};
    const add = (key, r) => { const g = groups[key] || (groups[key] = { loss: 0, n: 0 }); g.loss += r.loss; g.n++; };
    withLoss.forEach(r => {
      if (r.pos) add(r.pos, r);
      add('En el ' + STREET_NAMES[r.s].toLowerCase(), r);
      if (r.pt === '3bet') add('En botes con resubida (3-bet)', r);
      if (r.bc) add('Pagando (o no) apuestas en el river', r);
    });
    const topGroups = Object.entries(groups).sort((a, b) => b[1].loss - a[1].loss).slice(0, 5);
    const totalLoss = withLoss.reduce((a, r) => a + r.loss, 0);
    const raiseErrs = errs.filter(r => r.rec === 'RAISE' || r.act === 'RAISE').length;

    // --- Errores más repetidos ---
    const leaks = {};
    all.filter(r => r.g !== 'ok').forEach(r => { const k = r.act + '>' + r.rec; leaks[k] = (leaks[k] || 0) + (r.g === 'bad' ? 2 : 1); });
    const topLeaks = Object.entries(leaks).sort((a, b) => b[1] - a[1]).slice(0, 3);

    // --- Evolución: % de decisiones bien jugadas, últimas 4 semanas ---
    const WEEK = 7 * 24 * 3600 * 1000, now = Date.now();
    const weeks = [3, 2, 1, 0].map(w => {
      const rs = hand.filter(r => r.t && now - r.t >= w * WEEK && now - r.t < (w + 1) * WEEK);
      return [w === 0 ? 'Esta semana' : w === 1 ? 'Semana pasada' : `Hace ${w} semanas`, rs.length, pct(rs, 'ok')];
    });

    const byStreet = STREET_NAMES.map((n, s) => { const rs = all.filter(r => r.s === s); return [n, rs.length, pct(rs, 'ok')]; });
    const bars = (rows) => `<div class="finals">${rows.map(([n, c, p]) => `<div class="final-row"><span>${n} <small style="color:var(--cream-dim)">(${c})</small></span><div class="bar"><i style="width:${c ? Math.max(2, p) : 0}%"></i></div><b>${c ? p + '%' : '—'}</b></div>`).join('')}</div>`;

    openModal('Tu progreso', `
      <div class="stat-grid" style="margin-top:0; grid-template-columns:repeat(3,1fr);">
        <div class="stat no-help"><b>${hist.length}</b><span>Manos analizadas</span></div>
        <div class="stat no-help"><b style="color:${evAvg === null ? 'var(--cream)' : evAvg >= 0 ? 'var(--ok)' : 'var(--crimson)'}">${evAvg === null ? '—' : (evAvg >= 0 ? '+' : '') + fmt1(evAvg) + ' BB'}</b><span>EV medio</span></div>
        <div class="stat no-help"><b style="color:var(--ok)">${pct(all, 'ok')}%</b><span>Decisiones bien jugadas</span></div>
      </div>
      ${evAvg === null && hist.length ? '<p class="hint" style="margin:6px 0 0;">El EV medio en ciegas grandes aparece cuando apuntas la secuencia de apuestas.</p>' : ''}
      ${hist.length ? `<div class="sub-title">Lo que te recomienda RÍO</div><div class="finals">${decRow('CALL', 'Pagar')}${decRow('RAISE', 'Subir / apostar')}${decRow('FOLD', 'Tirar')}${decRow('CHECK', 'Pasar')}</div>` : ''}

      <div class="sub-title">🔎 Dónde pierdes más EV <small style="color:var(--cream-dim); font-weight:500;">(estimado)</small></div>
      ${topGroups.length ? `<p style="margin:0 0 8px;">En total, unas <b style="color:var(--crimson)">−${fmt1(totalLoss)} BB</b> en ${withLoss.length} decisiones mejorables.</p>
        <div class="loss-list">${topGroups.map(([k, g]) => `<div class="loss-row"><span>${k}</span><b>−${fmt1(g.loss)} BB</b><small>${g.n} ${g.n === 1 ? 'vez' : 'veces'}</small></div>`).join('')}</div>`
        : '<p style="margin:0;">Aún no hay errores de pagar, tirar, apostar o pasar con la secuencia apuntada. 👏</p>'}
      ${raiseErrs ? `<p class="hint" style="margin:8px 0 0;">Además, <b>${raiseErrs}</b> ${raiseErrs === 1 ? 'decisión' : 'decisiones'} de subir mejorable${raiseErrs === 1 ? '' : 's'} (el EV al subir no se puede estimar bien, así que solo las contamos).</p>` : ''}

      <div class="sub-title">Tus errores más repetidos</div>
      ${topLeaks.length ? `<ol style="margin:0; padding-left:20px;">${topLeaks.map(([k]) => `<li>${LEAKS[k] || k.replace('>', ' en vez de ')}</li>`).join('')}</ol>` : '<p style="margin:0;">¡Ninguno por ahora! 👏</p>'}

      <div class="sub-title">Tu evolución (% bien jugadas)</div>
      ${bars(weeks)}
      <div class="sub-title">Por calle (% bien jugadas)</div>
      ${bars(byStreet)}
      ${train.length ? `<div class="sub-title">Entrenamiento</div><p style="margin:0;">${train.length} manos · ${pct(train, 'ok')}% acertadas</p>` : ''}
      <p class="hint" style="margin-top:14px;">El EV perdido es una estimación: depende de las manos que suponemos a tu rival. Solo cuenta las manos con la secuencia apuntada.</p>`);
  }

  // ---- Modo entrenamiento ----
  const TRAIN_SPOTS = [['BTN','BB'],['CO','BB'],['BB','BTN'],['SB','BB'],['UTG','BB'],['BTN','SB'],['HJ','BTN'],['BB','CO'],['CO','BTN']];
  let trainQ = null;
  const pickRand = (arr) => arr[Math.floor(Math.random() * arr.length)];
  function newTrainQ(){
    const deck = drawN(fullDeck(), 7);
    const hero = [deck[0], deck[1]];
    const r = Math.random();
    const s = r < 0.2 ? 0 : r < 0.5 ? 1 : r < 0.75 ? 2 : 3;
    if (s === 0) return { s, hero, board: [], hp: pickRand(['UTG','HJ','CO','BTN','SB']), vp: null, pot: 3, call: 0, kind: 'open' };
    const [hp, vp] = pickRand(TRAIN_SPOTS);
    const potBefore = Math.round(6 + Math.random() * 54);
    const facing = Math.random() < 0.6;
    const bet = facing ? Math.max(1, Math.round(potBefore * pickRand([0.33, 0.5, 0.66, 1]))) : 0;
    return { s, hero, board: deck.slice(2, 2 + [0, 3, 4, 5][s]), hp, vp, pot: potBefore + bet, call: bet, kind: facing ? 'facing' : 'checked' };
  }
  function solveTrainQ(q){
    if (q.kind === 'open'){
      const top = handTopPercent(q.hero[0], q.hero[1]), lim = OPEN_PCT[q.hp];
      return { rec: top <= lim ? 'RAISE' : 'FOLD', top, lim, close: Math.abs(top - lim) <= 3 };
    }
    let pool = poolFromSet(topRange(q.vp === 'BB' ? 55 : (OPEN_PCT[q.vp] || 30)));
    if (q.kind === 'facing') pool = withBluffs(pool, q.board, 0.55, 0.1, q.hero);
    const r = runEquity(q.hero, q.board, 1, 1500, pool);
    const eq = r.win + r.tie / 2;
    const needed = q.call > 0 ? q.call / (q.pot + q.call) * 100 : 0;
    const oop = POSITION_ORDER.indexOf(q.hp) <= POSITION_ORDER.indexOf(q.vp);
    const reco = recommend({ heroCards: q.hero, boardCards: q.board, pot: q.pot, toCall: q.call, rivals: 1, pool, oop, street: q.s, heroPos: q.hp, eq });
    const bluff = reco.kind === 'bluff' ? reco.bc : null;
    return { rec: reco.text, eq, needed, oop, bluff, downgraded: reco.downgraded, close: q.call > 0 && Math.abs(eq - needed) <= 3 };
  }
  function openTrainer(){
    closeSidebar();
    trainQ = newTrainQ();
    const q = trainQ, stats = storageGet('rio_train', { n: 0, ok: 0, streak: 0 });
    const opts = q.kind === 'open' ? [['FOLD', 'Tirar'], ['RAISE', 'Subir']]
      : q.kind === 'facing' ? [['FOLD', 'Tirar'], ['CALL', 'Pagar'], ['RAISE', 'Subir']]
      : [['CHECK', 'Pasar'], ['BET', 'Apostar']];
    const question = q.kind === 'open'
      ? `Estás en <b>${q.hp}</b> y nadie ha entrado antes que tú. ¿Abres (subes) o tiras?`
      : `Estás en <b>${q.hp}</b> contra <b>${q.vp}</b>, en el <b>${STREET_NAMES[q.s].toLowerCase()}</b>. ${q.kind === 'facing'
          ? `El bote es de <b>${q.pot}</b> y tu rival apuesta <b>${q.call}</b> (ya incluido). ¿Qué haces?`
          : `El bote es de <b>${q.pot}</b> y nadie ha apostado. ¿Qué haces?`}`;
    const body = openModal('🎯 Entrenamiento', `
      <button type="button" class="link-btn" id="trainToGame" style="display:block; margin:0 0 10px;">🃏 ¿Prefieres una mano completa? Juega una partida de práctica →</button>
      <div class="train-score">Mano ${stats.n + 1} · ${stats.ok}/${stats.n} acertadas${stats.streak > 1 ? ` · 🔥 racha de ${stats.streak}` : ''}</div>
      <div class="train-cards"><div><div class="zone-label">Tu mano</div>${q.hero.map(c => cardHTML(c, true)).join('')}</div>
      ${q.board.length ? `<div><div class="zone-label">Mesa</div>${q.board.map(c => cardHTML(c, true)).join('')}</div>` : ''}</div>
      <p>${question}</p>
      <div class="train-opts">${opts.map(([v, l]) => `<button type="button" class="btn-secondary" data-ans="${v}">${l}</button>`).join('')}</div>
      <div id="trainResult"></div>`);
    body.querySelectorAll('[data-ans]').forEach(b => b.addEventListener('click', () => answerTrainer(b.dataset.ans)));
    body.querySelector('#trainToGame').addEventListener('click', openPartida);
  }
  function answerTrainer(act){
    const body = document.getElementById('helpBody');
    body.querySelectorAll('[data-ans]').forEach(b => { b.disabled = true; if (b.dataset.ans === act) b.classList.add('chosen'); });
    document.getElementById('trainResult').innerHTML = '<p class="hint">Calculando…</p>';
    setTimeout(() => {
      const q = trainQ, sol = solveTrainQ(q);
      let g = grade(sol.rec, act);
      if (g === 'bad' && sol.close) g = 'meh';
      if (q.kind === 'open' && g === 'meh' && !sol.close) g = 'bad';
      const stats = storageGet('rio_train', { n: 0, ok: 0, streak: 0 });
      stats.n++; if (g === 'ok'){ stats.ok++; stats.streak++; } else stats.streak = 0;
      storageSet('rio_train', stats);
      const log = storageGet('rio_train_log', []); log.push({ s: q.s, rec: sol.rec, act, g }); storageSet('rio_train_log', log.slice(-300));
      let why;
      if (q.kind === 'open') why = `Tu mano está en el <b>top ${Math.max(1, Math.round(sol.top))}%</b> y desde ${q.hp} se suele abrir aproximadamente el <b>${sol.lim}%</b> de las manos.`;
      else if (sol.bluff && sol.bluff.better) why = `Tu mano no es la mejor (ganas unas ${of20(sol.eq)} de cada 20), pero si apuestas el rival se retira unas <b>${of20(sol.bluff.f * 100)} de cada 20</b> veces: el farol compensa.`;
      else if (q.kind === 'facing' && sol.downgraded) why = `Vas por delante de buena parte de su rango (ganas unas ${of20(sol.eq)} de cada 20), pero si subes solo te pagarían las manos que te ganan: <b>paga</b>.`;
      else if (q.kind === 'facing') why = `Ganas unas <b>${of20(sol.eq)} de cada 20</b> veces y para que pagar compense necesitas <b>${of20(sol.needed)}</b>.<span class="pro-only"> (Equity ${sol.eq.toFixed(1).replace('.', ',')}% · necesitas ${sol.needed.toFixed(1).replace('.', ',')}%)</span>`;
      else why = `Ganas unas <b>${of20(sol.eq)} de cada 20</b> veces contra su rango.${sol.rec === 'BET' ? ' Apostar rinde más que pasar: las manos peores te pagan.' : ' Apostar no rinde más que pasar: las peores se retirarían y solo te pagarían las mejores. Pasa.'}`;
      const head = { ok: '✓ ¡Correcto!', meh: '≈ Aceptable', bad: '✗ No era la mejor' }[g];
      // Al llegar a 10 situaciones, una sola vez: invitar a analizar sus propias manos.
      const funnel = stats.n >= 10 && !storageGet('rio_train_funnel', false);
      if (funnel) storageSet('rio_train_funnel', true);
      document.getElementById('trainResult').innerHTML = `
        <div class="train-verdict ${g}">${head}</div>
        <p>Lo recomendado: <b>${decisionHTML(sol.rec)}</b>. ${why}</p>
        ${funnel ? `<div class="train-funnel">🎯 <b>Ya llevas ${stats.n} situaciones.</b> ¿Quieres analizar tus propias manos?
          <button type="button" class="btn-primary" id="trainToAnalyzer" style="width:100%; margin-top:10px;">Ir al analizador →</button></div>` : ''}
        <button type="button" class="${funnel ? 'btn-secondary' : 'btn-primary'}" id="trainNext" style="width:100%;">Siguiente mano →</button>`;
      document.getElementById('trainNext').addEventListener('click', openTrainer);
      if (funnel) document.getElementById('trainToAnalyzer').addEventListener('click', () => {
        helpModal.classList.remove('show');
        document.querySelector('.entry-q').scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }, 30);
  }

  // ---- Partida de práctica (mesa de 6 a pantalla completa, en partida.js) ----
  function openPartida(){
    closeSidebar(); closeModal();
    if (window.RIO_PARTIDA) window.RIO_PARTIDA.open();
  }

  // ---- Importar historial de mano (PokerStars / GGPoker) ----
  function parseHandHistory(txt){
    const num = (x) => parseFloat(String(x).replace(/,/g, ''));
    const dealt = txt.match(/Dealt to (.+?) \[(\S\S) (\S\S)\]/);
    if (!dealt) throw new Error('No encuentro tus cartas ("Dealt to …"). ¿Has copiado la mano completa?');
    const heroName = dealt[1].trim();
    const heroCards = [parseCardToken(dealt[2]), parseCardToken(dealt[3])];
    if (!heroCards[0] || !heroCards[1]) throw new Error('No entiendo tus cartas en el historial.');
    const blinds = txt.match(/\(\s*[^\d(\/]*([\d.,]+)\s*\/\s*[^\d(\/]*([\d.,]+)/);
    const bb = blinds ? num(blinds[2]) : null;
    const buttonSeat = Number((txt.match(/Seat #(\d+) is the button/) || [])[1]);
    const lines = txt.replace(/\r/g, '').split('\n').map(l => l.trim()).filter(Boolean);
    const seats = [];
    for (const l of lines){
      if (l.startsWith('***')) break;
      const m = l.match(/^Seat (\d+): (.+?) \(\s*[^\d(]*([\d.,]+)/);
      if (m && !/sitting out/i.test(l)) seats.push({ seat: Number(m[1]), name: m[2].trim(), stack: num(m[3]) });
    }
    if (seats.length < 2) throw new Error('No encuentro los jugadores de la mesa ("Seat 1: …").');
    seats.sort((a, b) => a.seat - b.seat);
    let bi = seats.findIndex(p => p.seat === buttonSeat);
    if (bi === -1) bi = seats.length - 1;
    const order = [...seats.slice(bi + 1), ...seats.slice(0, bi + 1)]; // SB, BB, … , BTN
    const n = order.length, posOf = {};
    order.forEach((p, i) => {
      let pos;
      if (n === 2) pos = i === 1 ? 'BTN' : 'BB';
      else if (i === 0) pos = 'SB'; else if (i === 1) pos = 'BB'; else if (i === n - 1) pos = 'BTN';
      else if (i === n - 2) pos = 'CO'; else if (i === n - 3) pos = 'HJ'; else pos = 'UTG';
      posOf[p.name] = pos;
    });
    const boardCards = [], acts = [];
    let street = -1;
    for (const l of lines){
      if (/^\*\*\* HOLE CARDS/.test(l)){ street = 0; continue; }
      const st = l.match(/^\*\*\* (FLOP|TURN|RIVER) \*\*\*/);
      if (st){
        street = { FLOP: 1, TURN: 2, RIVER: 3 }[st[1]];
        const groups = [...l.matchAll(/\[([^\]]+)\]/g)].map(g => g[1]);
        const fresh = street === 1 ? groups[0].split(/\s+/) : [groups[groups.length - 1].trim()];
        fresh.forEach(t => { const c = parseCardToken(t); if (c) boardCards.push(c); });
        continue;
      }
      if (/^\*\*\* (SHOW ?DOWN|SUMMARY)/.test(l)) break;
      if (street < 0) continue;
      const m = l.match(/^(.+?): (folds|checks|calls|bets|raises)(?:\s+[^\d\s]*([\d.,]+))?(?:\s+to\s+[^\d\s]*([\d.,]+))?/);
      if (!m) continue;
      acts.push({ street, name: m[1].trim(), type: m[2], amount: m[3] ? num(m[3]) : 0, to: m[4] ? num(m[4]) : 0 });
    }
    // El rival es el que más aguanta en la mano contigo (y, si empatan, el que más mete).
    const opps = [...new Set(acts.map(a => a.name))].filter(nm => nm !== heroName);
    if (!opps.length) throw new Error('No encuentro rivales que actuaran en la mano.');
    const lastIdx = (nm) => { const i = acts.findIndex(a => a.name === nm && a.type === 'folds'); return i === -1 ? Infinity : i; };
    const money = (nm) => acts.filter(a => a.name === nm).reduce((t, a) => t + (a.to || a.amount), 0);
    opps.sort((a, b) => (lastIdx(b) - lastIdx(a)) || (money(b) - money(a)));
    const villName = opps[0];
    const newSeq = [[], [], [], []];
    for (const a of acts){
      if (a.name !== heroName && a.name !== villName) continue;
      const who = a.name === heroName ? 'hero' : 'vill';
      const type = { folds: 'fold', checks: 'check', calls: 'call', bets: 'bet', raises: 'raise' }[a.type];
      const act = { who, type };
      if (type === 'bet') act.to = a.amount;
      if (type === 'raise') act.to = a.to || a.amount;
      newSeq[a.street].push(act);
    }
    const stayed = opps.filter(nm => lastIdx(nm) === Infinity).length;
    return {
      heroCards, boardCards: boardCards.slice(0, 5), bb, seq: newSeq, villName,
      heroPos: posOf[heroName] || 'BTN', villPos: posOf[villName] || 'BB',
      heroStack: (seats.find(p => p.name === heroName) || {}).stack, villStack: (seats.find(p => p.name === villName) || {}).stack,
      rivals: Math.max(1, stayed || 1), tourney: /Tournament/i.test(txt)
    };
  }
  function openImport(){
    closeSidebar();
    if (!isPro()){ openPaywall('plans'); return; }
    const body = openModal('📋 Importar historial de mano', `
      <p style="margin-top:0;">En PokerStars o GGPoker, abre el historial de la mano, <b>cópialo entero</b> y pégalo aquí.</p>
      <textarea id="hhText" rows="9" placeholder="PokerStars Hand #…&#10;Table '…' 6-max Seat #1 is the button&#10;…" style="width:100%; border-radius:10px; border:1px solid var(--line); background:var(--panel-2); color:var(--cream); padding:10px; font-family:monospace; font-size:0.78rem;"></textarea>
      <button type="button" class="btn-primary" id="hhGo" style="width:100%; margin-top:10px;">Importar mano</button>
      <div id="hhMsg" class="restore-msg"></div>`);
    body.querySelector('#hhGo').addEventListener('click', () => {
      const msg = document.getElementById('hhMsg');
      try {
        const h = parseHandHistory(document.getElementById('hhText').value);
        hole = h.heroCards; board = [0, 1, 2, 3, 4].map(i => h.boardCards[i] || null);
        document.getElementById('heroPosInput').value = h.heroPos;
        document.getElementById('villPosInput').value = h.villPos;
        numRivals = h.rivals; rivVal.textContent = numRivals;
        if (h.bb) document.getElementById('bbInput').value = h.bb;
        document.getElementById('stackInput').value = h.heroStack || '';
        document.getElementById('villStackInput').value = h.villStack || '';
        if (h.tourney) setGame('torneo');
        seq = h.seq; seqStreet = Math.max(0, h.boardCards.length >= 5 ? 3 : h.boardCards.length >= 4 ? 2 : h.boardCards.length >= 3 ? 1 : 0);
        seqActor = null; seqPending = null; selStreet = null;
        document.getElementById('seqBox').open = true;
        updateOrderHint(); render();
        closeModal();
        const status = document.getElementById('screenshotStatus');
        status.style.display = 'block'; status.style.color = 'var(--ok)';
        status.textContent = `✅ Mano importada: tú (${h.heroPos}) contra ${h.villName} (${h.villPos}). Elige la calle y pulsa Analizar.`;
        document.getElementById('streetBtns').scrollIntoView({ behavior: 'smooth', block: 'center' });
      } catch (e){
        msg.textContent = e.message || 'No se pudo leer el historial.'; msg.className = 'restore-msg no';
      }
    });
  }

  // ---- Instalar como app ----
  let deferredInstall = null;
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredInstall = e; });
  function installApp(){
    closeSidebar();
    if (deferredInstall){ deferredInstall.prompt(); deferredInstall = null; return; }
    openModal('📲 Instalar RÍO en el móvil', `
      <p><b>iPhone (Safari):</b> pulsa el botón <b>Compartir</b> (el cuadrado con la flecha) → <b>Añadir a pantalla de inicio</b>.</p>
      <p><b>Android (Chrome):</b> pulsa los <b>tres puntos</b> arriba a la derecha → <b>Instalar aplicación</b> o <b>Añadir a pantalla de inicio</b>.</p>
      <p class="hint">Tendrás RÍO con su icono, a pantalla completa, como una app más.</p>`);
  }
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('/sw.js').catch(() => {});

  // ---- Bienvenida (primera visita) ----
  function openWelcome(){
    const body = openModal('¡Te damos la bienvenida a RÍO! 👋', `
      <p style="margin-top:0;">Tu entrenador de póker: le das una mano y te dice <b>qué hacer y por qué</b>.</p>
      <div class="welcome-steps">
        <div><span>🃏</span><p><b>Mete tu mano</b><br>Con una captura, contándola o a mano.</p></div>
        <div><span>🎯</span><p><b>Te dice qué hacer</b><br>Pagar, subir o tirar, explicado fácil.</p></div>
        <div><span>📈</span><p><b>Aprende de tus errores</b><br>Guarda tus manos y mira dónde fallas.</p></div>
      </div>
      <p class="hint" style="margin:0 0 16px; text-align:center;">1 análisis de prueba sin registrarte · ${FREE_LIMIT} más con tu cuenta gratis</p>
      <div class="welcome-q">¿Ya juegas al póker?</div>
      <div class="welcome-choices">
        <button type="button" class="welcome-choice" data-welcome="facil">🙂<b>Estoy empezando</b><small>Modo Fácil</small></button>
        <button type="button" class="welcome-choice" data-welcome="pro">😎<b>Ya juego</b><small>Modo Avanzado</small></button>
      </div>
      <button type="button" class="link-btn" data-welcome="train" style="display:block; margin:12px auto 0;">🎯 Prefiero practicar primero</button>`);
    body.querySelectorAll('[data-welcome]').forEach(b => b.addEventListener('click', () => {
      const w = b.dataset.welcome;
      if (w === 'train'){ openTrainer(); return; }
      setMode(w); closeModal();
    }));
  }
  if (!storageGet('rio_onboarded', false)){
    storageSet('rio_onboarded', true);
    setTimeout(openWelcome, 400);
  }

  // Menú
  document.getElementById('navTrain').addEventListener('click', openTrainer);
  document.getElementById('navPartida').addEventListener('click', openPartida);
  document.getElementById('navCharts').addEventListener('click', () => { closeSidebar(); openCharts(); });
  document.getElementById('navStats').addEventListener('click', () => { closeSidebar(); openStats(); });
  document.getElementById('navImport').addEventListener('click', openImport);
  document.getElementById('navInstall').addEventListener('click', installApp);
  document.getElementById('importBtn').addEventListener('click', openImport);
  document.getElementById('trainLink').addEventListener('click', openTrainer);
  document.getElementById('partidaLink').addEventListener('click', openPartida);

  // ---- Cuéntame tu mano (texto o voz → mano rellenada) ----
  const escHTML = (x) => String(x).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  let storyRec = null;
  function stopStoryRec(){ if (storyRec){ try { storyRec.stop(); } catch (e) {} storyRec = null; } }
  document.getElementById('closeHelp').addEventListener('click', stopStoryRec);
  helpModal.addEventListener('click', (e) => { if (e.target === helpModal) stopStoryRec(); });

  function openStory(){
    closeSidebar();
    if (!isPro()){ openPaywall('plans'); return; }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const body = openModal('🎙️ Cuéntame tu mano', `
      <p style="margin-top:0;">Cuéntala como se la contarías a un amigo: <b>tus cartas, tu posición, las cartas de la mesa y qué apostó cada uno</b>.</p>
      <textarea id="storyText" rows="7" placeholder="Ej.: Jugábamos 1/2. Tenía as-rey de picas en el botón y subí a 6. El de la ciega grande pagó. Flop rey de corazones, siete, dos. Él pasó, aposté 8 y pagó. Turn un cuatro, pasamos los dos. River una reina y me apostó 25." style="width:100%; border-radius:10px; border:1px solid var(--line); background:var(--panel-2); color:var(--cream); padding:12px; font-family:'Space Grotesk',sans-serif; font-size:0.95rem; line-height:1.45;"></textarea>
      ${SR ? '<button type="button" class="btn-secondary" id="storyMic" style="width:100%; margin-top:10px;">🎙️ Dictar por voz</button>'
           : '<p class="hint">Para dictar, pulsa el micrófono del teclado de tu móvil.</p>'}
      <button type="button" class="btn-primary" id="storyGo" style="width:100%; margin-top:10px;">Rellenar la mano</button>
      <div id="storyMsg" class="restore-msg"></div>
      <p class="hint" style="margin-top:8px;">Gasta <b>1 crédito de IA</b>.</p>`);
    const ta = body.querySelector('#storyText');
    const msg = body.querySelector('#storyMsg');
    const mic = body.querySelector('#storyMic');
    if (mic) mic.addEventListener('click', () => {
      if (storyRec){ stopStoryRec(); return; }
      const rec = new SR();
      rec.lang = 'es-ES'; rec.continuous = true; rec.interimResults = true;
      const base = ta.value ? ta.value.replace(/\s*$/, ' ') : '';
      rec.onresult = (ev) => {
        let finalTxt = '', interim = '';
        for (let i = 0; i < ev.results.length; i++){
          if (ev.results[i].isFinal) finalTxt += ev.results[i][0].transcript + ' ';
          else interim += ev.results[i][0].transcript;
        }
        ta.value = (base + finalTxt + interim).replace(/\s+/g, ' ').trimStart();
      };
      rec.onerror = (ev) => {
        msg.className = 'restore-msg no';
        msg.textContent = ev.error === 'not-allowed' || ev.error === 'service-not-allowed'
          ? 'Permite el acceso al micrófono en tu navegador para dictar.'
          : 'No se pudo usar el micrófono. Prueba a escribirla.';
      };
      rec.onend = () => { storyRec = null; mic.textContent = '🎙️ Dictar por voz'; mic.classList.remove('active'); };
      try {
        rec.start(); storyRec = rec;
        mic.textContent = '⏹️ Parar el dictado'; mic.classList.add('active');
        msg.className = 'restore-msg'; msg.textContent = 'Te escucho… cuenta la mano y pulsa "Parar" al terminar.';
      } catch (e){ msg.className = 'restore-msg no'; msg.textContent = 'No se pudo usar el micrófono. Prueba a escribirla.'; }
    });
    body.querySelector('#storyGo').addEventListener('click', async () => {
      stopStoryRec();
      const text = ta.value.trim();
      if (text.length < 15){ msg.className = 'restore-msg no'; msg.textContent = 'Cuéntame un poco más: tus cartas, las de la mesa y qué apostó cada uno.'; return; }
      const btn = body.querySelector('#storyGo');
      btn.disabled = true; btn.textContent = 'Entendiendo tu mano…';
      msg.className = 'restore-msg'; msg.textContent = '';
      try {
        const r = await fetch('/api/parse-hand', { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify({ text }) });
        let data = {}; try { data = await r.json(); } catch (e) {}
        if (r.status === 401){ logoutPro(); updateUsageBadge(); closeModal(); openPaywall('login'); return; }
        if (r.status === 402){ closeModal(); openPaywall('plans'); return; }
        if (r.status === 403 && data.error === 'LIMIT_REACHED'){ closeModal(); openCreditsModal(true); return; }
        if (!r.ok) throw new Error(data.error || 'No se pudo entender la mano.');
        const notes = applyStory(data);
        closeModal();
        const status = document.getElementById('screenshotStatus');
        status.style.display = 'block'; status.style.color = 'var(--ok)';
        status.innerHTML = '✅ Mano rellenada a partir de tu relato. Revisa que esté todo bien y pulsa <b>Analizar</b>.' +
          (notes.length ? `<ul style="text-align:left; color:var(--cream-dim); margin:6px 0 0; padding-left:18px;">${notes.map(n => `<li>${escHTML(n)}</li>`).join('')}</ul>` : '');
        refreshPhotoUsage();
        document.getElementById('holeRow').scrollIntoView({ behavior: 'smooth', block: 'center' });
      } catch (e){
        msg.className = 'restore-msg no'; msg.textContent = e.message || 'No se pudo entender la mano.';
      } finally {
        btn.disabled = false; btn.textContent = 'Rellenar la mano';
      }
    });
  }

  // Aplica lo que ha entendido la IA. Devuelve las notas para enseñárselas al usuario.
  function applyStory(d){
    const cardsOf = (str) => String(str || '').trim().split(/\s+/).map(parseCardToken).filter(Boolean);
    const hc = cardsOf(d.heroCards).slice(0, 2);
    if (hc.length < 2) throw new Error('No he entendido tus dos cartas. Dilas claramente, por ejemplo: "as y rey de picas".');
    const bc = cardsOf(d.board).slice(0, 5);
    const keys = [...hc, ...bc].map(cardKey);
    if (new Set(keys).size !== keys.length) throw new Error('Me sale una carta repetida. Revisa los palos en tu relato.');
    hole = hc; board = [0, 1, 2, 3, 4].map(i => bc[i] || null);
    if (VALID_POS.includes(d.heroPos)) document.getElementById('heroPosInput').value = d.heroPos;
    if (VALID_POS.includes(d.villPos) && d.villPos !== d.heroPos) document.getElementById('villPosInput').value = d.villPos;
    if (Number(d.bigBlind) > 0) document.getElementById('bbInput').value = Number(d.bigBlind);
    if (Number(d.rivals) >= 1){ numRivals = Math.min(9, Math.round(Number(d.rivals))); rivVal.textContent = numRivals; }
    document.getElementById('stackInput').value = Number(d.heroStack) > 0 ? Number(d.heroStack) : '';
    document.getElementById('villStackInput').value = Number(d.villStack) > 0 ? Number(d.villStack) : '';
    if (!(Number(d.rivals) >= 1)){ numRivals = 1; rivVal.textContent = numRivals; }
    if (d.tournament === true) setGame('torneo'); else if (d.tournament === false) setGame('cash');
    const ST = { preflop: 0, flop: 1, turn: 2, river: 3 };
    const newSeq = [[], [], [], []];
    (Array.isArray(d.actions) ? d.actions : []).forEach(a => {
      const s = ST[a && a.street];
      if (s === undefined || !['check', 'bet', 'call', 'raise', 'fold'].includes(a.type)) return;
      const act = { who: a.who === 'hero' ? 'hero' : 'vill', type: a.type };
      if (a.type === 'bet' || a.type === 'raise'){ const amt = Number(a.amount); if (!(amt > 0)) return; act.to = amt; }
      newSeq[s].push(act);
    });
    seq = newSeq; seqActor = null; seqPending = null; selStreet = null;
    seqStreet = Math.max(0, bc.length >= 5 ? 3 : bc.length >= 4 ? 2 : bc.length >= 3 ? 1 : 0);
    if (newSeq.some(x => x.length)) document.getElementById('seqBox').open = true;
    updateOrderHint(); render();
    return (Array.isArray(d.notes) ? d.notes : []).filter(n => typeof n === 'string' && n.trim()).slice(0, 5);
  }
  document.getElementById('storyBtn').addEventListener('click', openStory);
  document.getElementById('navStory').addEventListener('click', openStory);

  // ---- Tus datos en la cuenta (historial, estadísticas, entrenamiento, ajustes) ----
  // Se guardan también en el servidor para no perderlos al cambiar de móvil.
  function syncKeys(){
    return ['rio_history', 'rio_reviews', 'rio_train', 'rio_train_log', 'rio_partidas', 'rio_pp_sesion', 'rio_profile', 'rio_mode', 'rio_range',
            'rio_game', 'rio_bluff', 'rio_unit', 'rio_sim_quality', 'rio_save_history', 'rio_remember_defaults', 'rio_defaults'];
  }
  // "var" y no "let": storageSet() la usa desde el arranque, antes de llegar a esta línea.
  var syncTimer = null, syncing = false;
  function onStoredKey(key){
    if (syncing || !syncKeys().includes(key) || !storageGet('rio_token', '')) return;
    clearTimeout(syncTimer);
    syncTimer = setTimeout(pushSync, 2500);
  }
  function collectData(){
    const o = {};
    syncKeys().forEach(k => { const v = storageGet(k, undefined); if (v !== undefined) o[k] = v; });
    return o;
  }
  async function pushSync(){
    if (!storageGet('rio_token', '')) return;
    try {
      await fetch('/api/user-data', { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify({ data: collectData() }) });
    } catch(e){}
  }
  // Junta lo del servidor con lo de este navegador sin perder nada de ninguno.
  async function pullSync(){
    if (!storageGet('rio_token', '')) return;
    let remote = null;
    try {
      const r = await fetch('/api/user-data', { headers: authHeaders() });
      if (!r.ok) return;
      remote = (await r.json()).data;
    } catch(e){ return; }
    syncing = true;
    try {
      if (remote){
        const local = collectData();
        const hk = (h) => [h.hand, h.t || h.when, h.equity, h.decision].join('|');
        const seen = new Set();
        const hist = [...(local.rio_history || []), ...(remote.rio_history || [])].filter(h => h && !seen.has(hk(h)) && seen.add(hk(h)));
        storageSet('rio_history', hist.sort((a, b) => (b.t || 0) - (a.t || 0)).slice(0, HISTORY_MAX));
        const rv = { ...(remote.rio_reviews || {}) };
        Object.entries(local.rio_reviews || {}).forEach(([k, v]) => { if (!rv[k] || rv[k].t < v.t) rv[k] = v; });
        storageSet('rio_reviews', rv);
        const lt = local.rio_train || { n: 0 }, rt = remote.rio_train || { n: 0 };
        if ((rt.n || 0) > (lt.n || 0)){ storageSet('rio_train', rt); storageSet('rio_train_log', remote.rio_train_log || []); }
        // Ajustes: los de la cuenta, salvo que este navegador ya tenga los suyos.
        syncKeys().filter(k => !['rio_history', 'rio_reviews', 'rio_train', 'rio_train_log'].includes(k))
          .forEach(k => { if (local[k] === undefined && remote[k] !== undefined) storageSet(k, remote[k]); });
        setMode(storageGet('rio_mode', 'facil')); setGame(storageGet('rio_game', 'cash'));
        renderHistory(); updateProfileUI();
      }
    } finally { syncing = false; }
    pushSync();
  }

  // ---- Plan anual (aparece cuando configures su enlace de pago de Stripe) ----
  // (var: se usa también al pintar "Tu plan", que puede ejecutarse antes de llegar aquí)
  var ANNUAL_PAYMENT_LINK = 'https://buy.stripe.com/7sY8wR3Vl3g0dOB7Ko9IQ06'; // RÍO PRO anual · 79,99 €/año
  document.querySelectorAll('.annual-btn').forEach(b => b.addEventListener('click', () => openPayment(ANNUAL_PAYMENT_LINK)));
  if (!ANNUAL_PAYMENT_LINK) document.querySelectorAll('.annual-part, #annualPlanCard').forEach(el => { el.style.display = 'none'; });

  // ---- ¿Consejo raro? Avisos de los usuarios ----
  function openFeedback(){
    const body = openModal('👎 ¿Te parece raro este consejo?', `
      <p style="margin-top:0;">Cuéntanos qué harías tú y por qué. Nos llega la mano con el análisis para revisarlo y mejorar RÍO.</p>
      <textarea id="fbText" rows="5" placeholder="Ej.: En el river contra dos apuestas seguidas yo me retiraría: este rival nunca farolea." style="width:100%; border-radius:10px; border:1px solid var(--line); background:var(--panel-2); color:var(--cream); padding:12px; font-family:'Space Grotesk',sans-serif; font-size:0.95rem;"></textarea>
      <button type="button" class="btn-primary" id="fbSend" style="width:100%; margin-top:10px;">Enviar aviso</button>
      <div id="fbMsg" class="restore-msg"></div>`);
    body.querySelector('#fbSend').addEventListener('click', async () => {
      const msg = body.querySelector('#fbMsg');
      const extra = `\nSecuencia: ${JSON.stringify(seq)}\nCalle analizada: ${STREET_NAMES[analysisStreet()]}\nRango rival: ${rangeLabel()} · faroles ${bluffFrac()}\nPartida: ${storageGet('rio_game', 'cash')}\nCartas: ${JSON.stringify({ hole, board })}`;
      try {
        const r = await fetch('/api/feedback', { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() },
          body: JSON.stringify({ comment: body.querySelector('#fbText').value, summary: (lastSummary || '') + extra, mode: storageGet('rio_mode', 'facil') }) });
        if (!r.ok) throw new Error();
        msg.className = 'restore-msg ok'; msg.textContent = '¡Gracias! Lo revisaremos.';
        setTimeout(closeModal, 1200);
      } catch(e){ msg.className = 'restore-msg no'; msg.textContent = 'No se pudo enviar. Inténtalo de nuevo.'; }
    });
  }
  document.getElementById('feedbackBtn').addEventListener('click', openFeedback);

  // Bandeja de avisos (solo para los emails de ADMIN_EMAILS)
  async function openInbox(){
    closeSidebar();
    const body = openModal('📥 Avisos de consejos raros', '<p class="hint">Cargando…</p>');
    try {
      const r = await fetch('/api/feedback', { headers: authHeaders() });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      body.innerHTML = d.items.length ? d.items.map(it => `
        <div class="inbox-item">
          <div class="hint">${escHTML(new Date(it.t).toLocaleString('es-ES'))} · ${escHTML(it.email || 'anónimo')} · modo ${escHTML(it.mode || '—')}</div>
          <p><b>${escHTML(it.comment || '(sin comentario)')}</b></p>
          <pre>${escHTML(it.summary)}</pre>
        </div>`).join('') : '<p>Aún no hay avisos.</p>';
    } catch(e){ body.innerHTML = `<p>${escHTML(e.message || 'No se pudieron cargar los avisos.')}</p>`; }
  }

  // ---- Estadísticas propias (solo administrador) ----
  async function openAdminStats(){
    closeSidebar();
    const body = openModal('📊 Estadísticas', '<p class="hint">Cargando…</p>');
    try {
      const r = await fetch('/api/stats', { headers: authHeaders() });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      const COLS = [['cuentas', 'Cuentas'], ['analisis', 'Manos'], ['pago', 'Clic pagar'], ['pro', 'PRO'], ['packs', 'Packs']];
      const tot = Object.fromEntries(COLS.map(([k]) => [k, d.dias.reduce((a, x) => a + (x[k] || 0), 0)]));
      const fila = (etq, v, cls = '') => `<tr class="${cls}"><td>${etq}</td>${COLS.map(([k]) => `<td>${v[k] || 0}</td>`).join('')}</tr>`;
      const fecha = (iso) => new Date(iso + 'T12:00:00Z').toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
      const origenes = Object.entries(d.porOrigen).sort((a, b) => ((b[1].cuentas || 0) - (a[1].cuentas || 0)));
      body.innerHTML = `
        <p class="hint">Cuentas totales: <b>${d.cuentasTotales}</b>. Las visitas están en Vercel → Analytics; aquí, lo que pasa después de entrar. Tus propias visitas y clics no cuentan.</p>
        <div class="stats-scroll"><table class="stats-tbl">
          <thead><tr><th>Día</th>${COLS.map(([, n]) => `<th>${n}</th>`).join('')}</tr></thead>
          <tbody>${fila('<b>Total 14 días</b>', tot, 'tot')}${d.dias.map(x => fila(escHTML(fecha(x.dia)), x)).join('')}</tbody>
        </table></div>
        <div class="sub-title" style="margin-top:16px;">De dónde vienen (desde siempre)</div>
        ${origenes.length ? `<div class="stats-scroll"><table class="stats-tbl">
          <thead><tr><th>Origen</th><th>Cuentas</th><th>PRO</th><th>Packs</th></tr></thead>
          <tbody>${origenes.map(([o, v]) => `<tr><td>${escHTML(o)}</td><td>${v.cuentas || 0}</td><td>${v.pro || 0}</td><td>${v.packs || 0}</td></tr>`).join('')}</tbody>
        </table></div>` : '<p class="hint">Todavía no hay cuentas nuevas con origen.</p>'}
        <p class="hint" style="margin-top:12px;">Enlaces cortos para tus bios y mensajes (cada uno cuenta para su red): <b>riopoker.es/ig</b> (Instagram) · <b>/yt</b> (YouTube) · <b>/tg</b> (Telegram) · <b>/dc</b> (Discord) · <b>/fb</b> (Facebook) · <b>/rd</b> (Reddit) · <b>/wa</b> (WhatsApp) · <b>/tt</b> (TikTok)</p>`;
    } catch(e){ body.innerHTML = `<p>${escHTML(e.message || 'No se pudieron cargar las estadísticas.')}</p>`; }
  }

  // ---- Compartir una mano por enlace ----
  // Toda la mano va dentro del propio enlace (#m=…), así no hace falta guardar
  // nada en el servidor. Quien lo abre ve el análisis sin cuenta y sin gastar
  // sus análisis gratis: es la forma de que RÍO llegue a gente nueva.
  var lastHandLabel = '';
  var freeRun = false;
  const TYPE_CH = { check: 'x', bet: 'b', call: 'c', raise: 'r', fold: 'f' };
  const CH_TYPE = { x: 'check', b: 'bet', c: 'call', r: 'raise', f: 'fold' };
  const cardTok = (c) => c ? RANK_CHARS[14 - c.rank] + c.suit : '-';
  function parseTokens(str){
    const out = [];
    for (let i = 0; i < str.length;){
      if (str[i] === '-'){ out.push(null); i++; continue; }
      out.push(parseCardToken(str.slice(i, i + 2))); i += 2;
    }
    return out;
  }
  const b64url = (str) => btoa(unescape(encodeURIComponent(str))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const unb64url = (str) => decodeURIComponent(escape(atob(str.replace(/-/g, '+').replace(/_/g, '/'))));
  function encodeHand(){
    const o = {
      v: 1, h: hole.map(cardTok).join(''), b: board.map(cardTok).join(''),
      hp: document.getElementById('heroPosInput').value, vp: document.getElementById('villPosInput').value,
      r: numRivals, bb: bbSize(),
      q: seq.map(st => st.map(a => (a.who === 'hero' ? 'h' : 'v') + TYPE_CH[a.type] + (a.to != null ? a.to : '')).join(',')),
      p: Number(document.getElementById('potInput').value) || 0, c: Number(document.getElementById('callInput').value) || 0,
      s: Number(document.getElementById('stackInput').value) || 0, vs: Number(document.getElementById('villStackInput').value) || 0,
      g: storageGet('rio_game', 'cash') === 'torneo' ? 1 : 0, bf: bluffFrac(), st: selStreet,
      rg: villRange.custom ? [...villRange.set].join('.') : Math.round(villRange.pct)
    };
    return b64url(JSON.stringify(o));
  }
  function shareUrl(){ return `${location.origin}/#m=${encodeHand()}`; }

  function loadSharedHand(){
    const m = location.hash.match(/^#m=([A-Za-z0-9_-]+)$/);
    if (!m) return;
    history.replaceState(null, '', location.pathname + location.search);
    let o;
    try { o = JSON.parse(unb64url(m[1])); } catch(e){ return; }
    if (!o || o.v !== 1) return;
    const hc = parseTokens(String(o.h || '')), bc = parseTokens(String(o.b || ''));
    if (!hc[0] || !hc[1]) return;
    hole = [hc[0], hc[1]]; board = [0, 1, 2, 3, 4].map(i => bc[i] || null);
    if (VALID_POS.includes(o.hp)) document.getElementById('heroPosInput').value = o.hp;
    if (VALID_POS.includes(o.vp)) document.getElementById('villPosInput').value = o.vp;
    numRivals = Math.max(1, Math.min(9, Number(o.r) || 1)); rivVal.textContent = numRivals;
    if (Number(o.bb) > 0) document.getElementById('bbInput').value = Number(o.bb);
    seq = [0, 1, 2, 3].map(i => String((o.q || [])[i] || '').split(',').filter(Boolean).map(t => {
      const a = { who: t[0] === 'h' ? 'hero' : 'vill', type: CH_TYPE[t[1]] };
      if (t.length > 2) a.to = Number(t.slice(2));
      return a;
    }).filter(a => a.type));
    document.getElementById('potInput').value = o.p || '';
    document.getElementById('callInput').value = o.c || '';
    document.getElementById('stackInput').value = o.s || '';
    document.getElementById('villStackInput').value = o.vs || '';
    // Rango y ajustes de la mano compartida, sin tocar los guardados de quien la abre.
    if (typeof o.rg === 'string'){ const set = new Set(o.rg.split('.').filter(n => HAND_RANKING.includes(n))); villRange = { set, pct: rangePct(set), custom: true }; }
    else if (Number(o.rg) > 0){ const pct = Math.max(2, Math.min(100, Number(o.rg))); villRange = { set: topRange(pct), pct, custom: false }; }
    if ([0.03, 0.1, 0.2].includes(o.bf)) document.getElementById('bluffSelect').value = String(o.bf);
    document.body.classList.toggle('tourney', o.g === 1);
    document.querySelectorAll('#gameType [data-game]').forEach(b => b.classList.toggle('active', b.dataset.game === (o.g === 1 ? 'torneo' : 'cash')));
    selStreet = Number.isInteger(o.st) ? o.st : null;
    seqStreet = Math.max(0, cardStreets() - 1); seqActor = null; seqPending = null;
    if (seq.some(x => x.length)) document.getElementById('seqBox').open = true;
    updateOrderHint(); render(); renderRangeUI();
    const banner = document.getElementById('sharedBanner');
    banner.innerHTML = '👀 <b>Te han compartido esta mano.</b> Abajo tienes el análisis de RÍO. ¿Tú qué habrías hecho?' +
      (storageGet('rio_token', '') ? '' : ' <a class="inline-link" id="sharedSignup">Crea tu cuenta gratis</a> para analizar las tuyas.');
    banner.style.display = 'block';
    const su = document.getElementById('sharedSignup');
    if (su) su.addEventListener('click', () => openPaywall('free'));
    freeRun = true;
    setTimeout(() => analyzeBtn.click(), 300);
  }

  async function shareHand(){
    const url = shareUrl();
    const text = `¿Tú qué harías con ${lastHandLabel || 'esta mano'}? Mírala en RÍO:`;
    const touch = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    if (navigator.share && touch){
      try { await navigator.share({ title: 'RÍO — mano de póker', text, url }); return; } catch(e){ if (e && e.name === 'AbortError') return; }
    }
    const body = openModal('📤 Compartir esta mano', `
      <p style="margin-top:0;">Quien abra el enlace verá la mano con el análisis, <b>sin registrarse</b>.</p>
      <a class="btn-primary share-wa" href="https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}" target="_blank" rel="noopener">💬 Enviar por WhatsApp</a>
      <button type="button" class="btn-secondary" id="shareCopy" style="width:100%; margin-top:10px;">🔗 Copiar enlace</button>
      <div id="shareMsg" class="restore-msg"></div>`);
    body.querySelector('#shareCopy').addEventListener('click', async () => {
      const msg = body.querySelector('#shareMsg');
      try { await navigator.clipboard.writeText(url); msg.className = 'restore-msg ok'; msg.textContent = '¡Enlace copiado!'; }
      catch(e){ msg.className = 'restore-msg'; msg.textContent = url; }
    });
  }
  document.getElementById('shareBtn').addEventListener('click', shareHand);
  document.getElementById('trialSignup').addEventListener('click', () => openPaywall('free'));

  const rivVal = document.getElementById('rivVal');
  document.getElementById('rivMinus').addEventListener('click', ()=>{ numRivals = Math.max(1, numRivals-1); rivVal.textContent = numRivals; });
  document.getElementById('rivPlus').addEventListener('click', ()=>{ numRivals = Math.min(9, numRivals+1); rivVal.textContent = numRivals; });

  ['heroPosInput', 'villPosInput'].forEach(id => document.getElementById(id).addEventListener('change', () => {
    updateOrderHint(); updateCurrentHand(); seqActor = null; renderSeq(); syncFromSeq();
  }));
  updateOrderHint();

  const usageRow = document.getElementById('usageRow');
  const historyPanel = document.getElementById('historyPanel');
  const historyList = document.getElementById('historyList');
  const paywall = document.getElementById('paywall');

  function updateUsageBadge(){
    if (isPro()){ usageRow.innerHTML = '<span class="pro-tag">★ RÍO PRO — análisis ilimitados</span>'; }
    else if (!storageGet('rio_token', '')){
      usageRow.innerHTML = storageGet('rio_anon_used', false)
        ? `Ya usaste tu análisis de prueba · <a class="inline-link" id="createFreeLink">crea tu cuenta gratis</a> y tendrás ${FREE_LIMIT} más`
        : `1 análisis de prueba sin registrarte · luego ${FREE_LIMIT} más con tu <a class="inline-link" id="createFreeLink">cuenta gratis</a>`;
      document.getElementById('createFreeLink').addEventListener('click', () => openPaywall('free'));
    }
    else {
      const left = freeLeft();
      usageRow.innerHTML = left <= 1
        ? `<span class="low">Te queda${left===1?'':'n'} ${left} análisis gratis</span>`
        : `${left} de ${FREE_LIMIT} análisis gratis restantes`;
    }
    updateUploadLockUI();
  }

  const uploadBox = document.getElementById('uploadBox');
  const uploadProBadge = document.getElementById('uploadProBadge');
  function updateUploadLockUI(){
    const pro = isPro();
    uploadBox.classList.toggle('locked', !pro);
    uploadProBadge.style.display = pro ? 'none' : 'inline-block';
    document.getElementById('uploadSub').textContent = '1 crédito de IA';
    document.getElementById('importProBadge').style.display = pro ? 'none' : 'inline-block';
    document.getElementById('storyProBadge').style.display = pro ? 'none' : 'inline-block';
  }
  document.getElementById('manualBtn').addEventListener('click', () => {
    const idx = hole.findIndex(c => !c);
    if (idx !== -1) openPicker('hole', idx);
    else document.getElementById('holeRow').scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
  uploadBox.addEventListener('click', (e) => {
    if (!isPro()){ e.preventDefault(); openPaywall(); }
  });

  function renderHistory(){
    const hist = getHistory();
    if (!hist.length){ historyPanel.style.display = 'none'; return; }
    historyPanel.style.display = 'block';
    const pro = isPro();
    document.body.classList.toggle('is-pro', pro);
    historyList.innerHTML = '';
    const fs = document.getElementById('hfStreet').value, fd = document.getElementById('hfDec').value;
    const fe = document.getElementById('hfEv').value, ferr = document.getElementById('hfErr').checked;
    let visible = pro ? hist : hist.slice(0, 1);
    if (pro) visible = visible.filter(h =>
      (fs === '' || String(h.st) === fs) && (fd === '' || h.decision === fd) &&
      (fe === '' || (typeof h.ev === 'number' && (fe === 'pos' ? h.ev >= 0 : h.ev < 0))) &&
      (!ferr || h.g === 'bad' || h.g === 'meh'));
    const YOU = { ok: '✅', meh: '≈', bad: '❌' };
    visible.forEach(h => {
      const row = document.createElement('div');
      row.className = 'history-item';
      const street = typeof h.st === 'number' ? STREET_NAMES[h.st] + ' · ' : '';
      const where = h.hp ? `${h.hp} vs ${h.vp} · ${h.game === 'torneo' ? 'Torneo' : 'Cash'} · ` : '';
      const date = h.t ? new Date(h.t).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : h.when;
      const ev = typeof h.ev === 'number'
        ? `<span class="h-ev ${h.ev >= 0 ? 'pos' : 'neg'}">${h.ev >= 0 ? '+' : ''}${String(h.ev).replace('.', ',')} ${h.evU || ''}</span>`
        : '<span class="h-ev">—</span>';
      const you = h.g ? `<span class="h-you" title="Hiciste ${DECISION_ES[h.act] || h.act}">${YOU[h.g]}<br>${decisionHTML(h.act)}</span>` : '<span class="h-you">—</span>';
      row.innerHTML = `<div><div class="h-hand">${h.hand}</div><div class="h-meta">${street}${where}${String(h.equity).replace(".", ",")}% de ganar · ${date}</div></div><span class="history-tag ${h.cls}">${decisionHTML(h.decision)}</span>${ev}${you}`;
      historyList.appendChild(row);
    });
    if (pro && !visible.length) historyList.innerHTML = '<div class="history-locked">Ninguna mano con esos filtros.</div>';
    if (pro) renderPatterns(hist);
    document.getElementById('histNote').innerHTML = pro
      ? '<b>EV</b>: lo que ganas o pierdes de media si pagas (o si apuestas, cuando no había nada que pagar). <b>Tu jugada</b>: ✅ hiciste lo recomendado · ≈ aceptable · ❌ error; solo aparece si apuntaste lo que hiciste en la secuencia de apuestas.'
      : '';
    if (!pro && hist.length > 1){
      const lock = document.createElement('div');
      lock.className = 'history-locked';
      lock.innerHTML = `+${hist.length-1} manos más guardadas. <a id="unlockHistoryLink">Desbloquea el historial completo con filtros y tus errores con RÍO PRO →</a>`;
      historyList.appendChild(lock);
      document.getElementById('unlockHistoryLink').addEventListener('click', () => openPaywall('plans'));
    }
  }
  // Patrones reales del historial: qué te recomienda RÍO en cada posición y cómo juegas tú.
  function renderPatterns(hist){
    const body = document.getElementById('histPatternsBody');
    const pctOf = (n, t) => t ? Math.round(n / t * 100) + '%' : '—';
    const withPos = hist.filter(h => h.hp);
    const byPos = {};
    withPos.forEach(h => {
      const p = byPos[h.hp] || (byPos[h.hp] = { n: 0, CALL: 0, RAISE: 0, FOLD: 0, CHECK: 0, rated: 0, ok: 0 });
      p.n++; p[h.decision === 'BET' ? 'RAISE' : h.decision]++;
      if (h.g){ p.rated++; if (h.g === 'ok') p.ok++; }
    });
    const rows = Object.entries(byPos).sort((a, b) => b[1].n - a[1].n);
    const rated = hist.filter(h => h.g);
    body.innerHTML = `
      <div class="pat-top"><div><b>${hist.length}</b><span>manos analizadas</span></div>
        <div><b>${rated.length ? pctOf(rated.filter(h => h.g === 'ok').length, rated.length) : '—'}</b><span>bien jugadas${rated.length ? ` (${rated.length} con secuencia)` : ''}</span></div></div>
      ${rows.length ? `<div class="pat-table"><div class="pat-row pat-h"><span>Posición</span><span>Manos</span><span>Pagar</span><span>Subir</span><span>Tirar</span><span>Tu acierto</span></div>
        ${rows.map(([pos, p]) => `<div class="pat-row"><span><b>${pos}</b></span><span>${p.n}</span><span>${pctOf(p.CALL, p.n)}</span><span>${pctOf(p.RAISE, p.n)}</span><span>${pctOf(p.FOLD, p.n)}</span><span>${p.rated ? pctOf(p.ok, p.rated) : '—'}</span></div>`).join('')}</div>
        <div class="hint" style="margin-top:6px;">Pagar / Subir / Tirar = lo que te recomendó RÍO en esa posición. Tu acierto solo cuenta las manos con la secuencia de apuestas apuntada.</div>`
        : '<div class="hint">El desglose por posición aparecerá con tus próximas manos analizadas.</div>'}`;
  }
  ['hfStreet', 'hfDec', 'hfEv', 'hfErr'].forEach(id => document.getElementById(id).addEventListener('change', renderHistory));

  function openPaywall(mode){
    if (mode === 'login'){
      document.getElementById('paywallTitle').textContent = 'Entra o crea tu cuenta gratis';
      document.getElementById('paywallCopy').innerHTML = 'Escribe tu email para entrar <b>en este dispositivo</b>. No hace falta contraseña: te enviamos un código. Tus manos y estadísticas se guardan en tu cuenta.';
    } else if (mode === 'free'){
      document.getElementById('paywallTitle').textContent = 'Crea tu cuenta gratis';
      document.getElementById('paywallCopy').innerHTML = `Ya usaste tu análisis de prueba. Crea tu cuenta gratis y tendrás <b>${FREE_LIMIT} análisis más</b>: solo tu email y un código, sin contraseña. Así tus manos y estadísticas se guardan aunque cambies de móvil.`;
    } else if (mode === 'plans'){
      document.getElementById('paywallTitle').textContent = 'Pásate a RÍO PRO';
      document.getElementById('paywallCopy').innerHTML = '¿Ya pagaste antes? Inicia sesión más abajo con tu email.';
    } else {
      document.getElementById('paywallTitle').textContent = 'Has agotado tus análisis gratis';
      document.getElementById('paywallCopy').innerHTML = `Ya usaste tus <b>${FREE_LIMIT} análisis gratis</b>. El entrenamiento, las tablas y el glosario siguen siendo gratis.`;
    }
    // Entrar o crear la cuenta gratis: sin precios, para que no parezca un pago.
    paywall.classList.toggle('login-mode', mode === 'login' || mode === 'free');
    paywall.classList.add('show');
    if (mode === 'login' || mode === 'free'){
      setTimeout(() => {
        document.getElementById('restoreBox').scrollIntoView({block:'center'});
        document.getElementById('proEmail').focus();
      }, 200);
    }
  }
  function closePaywall(){ paywall.classList.remove('show'); pendingAnalyze = false; pendingPayment = null; }
  document.getElementById('closePaywall').addEventListener('click', closePaywall);
  document.getElementById('seePlansLink').addEventListener('click', () => openPaywall('plans'));
  paywall.addEventListener('click', (e)=>{ if (e.target === paywall) closePaywall(); });

  const creditsModal = document.getElementById('creditsModal');
  // Si "out" es true, es porque se ha quedado sin créditos; si no, solo quiere ver los packs.
  function openCreditsModal(out){
    document.getElementById('creditsTitle').textContent = out ? 'Te has quedado sin créditos de IA' : 'Packs de créditos de IA';
    document.getElementById('creditsCopy').innerHTML = (out ? `Has gastado tus créditos. Los <b>${MONTHLY_CREDITS} de RÍO PRO</b> se renuevan cada mes; si no quieres esperar, compra un pack. ` : `RÍO PRO incluye <b>${MONTHLY_CREDITS} créditos de IA al mes</b>. Si necesitas más, compra un pack. `) +
      'Los análisis manuales siguen siendo <b>ilimitados</b>.';
    const packs = activePacks();
    document.getElementById('packList').innerHTML = packs.map((pk, i) => `
      <button type="button" class="pack ${pk.best ? 'best' : ''}" data-pack="${i}">
        ${pk.best ? '<span class="pack-tag">⭐ El más popular</span>' : ''}
        <span class="pack-credits">${pk.credits.toLocaleString('es-ES')} créditos</span>
        <span class="pack-price">${pk.price}</span>
        <span class="pack-unit">${pk.unit}</span>
      </button>`).join('');
    document.querySelectorAll('#packList [data-pack]').forEach(b => b.addEventListener('click', () => openPayment(packs[Number(b.dataset.pack)].link)));
    creditsModal.classList.add('show');
  }
  function closeCreditsModal(){ creditsModal.classList.remove('show'); }
  document.getElementById('closeCreditsModal').addEventListener('click', closeCreditsModal);
  creditsModal.addEventListener('click', (e)=>{ if (e.target === creditsModal) closeCreditsModal(); });
  document.getElementById('redeemCreditsBtn').addEventListener('click', async () => {
    const msg = document.getElementById('redeemMsg');
    const btn = document.getElementById('redeemCreditsBtn');
    if (!storageGet('rio_token', '')){ msg.textContent = 'Primero inicia sesión con tu email de RÍO PRO.'; msg.className = 'restore-msg no'; return; }
    btn.disabled = true; btn.textContent = 'Comprobando…';
    msg.textContent = ''; msg.className = 'restore-msg';
    try {
      const r = await fetch('/api/redeem-credits', { headers: authHeaders() });
      const data = await r.json();
      btn.disabled = false; btn.textContent = 'Ya los compré, actualizar créditos';
      if (!r.ok || data.error){ throw new Error(data.error || 'No se pudo comprobar la compra'); }
      if (data.added > 0){
        msg.textContent = `¡Añadidos ${data.added} créditos! Créditos extra: ${data.balance}.`;
        msg.className = 'restore-msg ok';
        refreshPhotoUsage();
        setTimeout(closeCreditsModal, 1400);
      } else {
        msg.textContent = 'Aún no vemos ninguna compra nueva. Espera unos segundos tras pagar e inténtalo de nuevo.';
        msg.className = 'restore-msg no';
      }
    } catch(e){
      btn.disabled = false; btn.textContent = 'Ya los compré, actualizar créditos';
      msg.textContent = 'No se pudo comprobar la compra. Inténtalo de nuevo en unos segundos.';
      msg.className = 'restore-msg no';
    }
  });
  document.getElementById('subscribeBtn').addEventListener('click', () => openPayment(PAYMENT_LINK));
  document.querySelectorAll('.paid-check').forEach(btn => btn.addEventListener('click', async () => {
    const msg = btn.nextElementSibling;
    if (!storageGet('rio_token', '')){ msg.className = 'restore-msg paid-msg'; msg.textContent = 'Primero entra con tu email (más abajo o en el menú).'; return; }
    btn.disabled = true; msg.className = 'restore-msg paid-msg'; msg.textContent = 'Comprobando tu pago…';
    const pro = await recheckPro(true, true); // a fondo: también busca pagos cuyo aviso de Stripe no llegó
    btn.disabled = false;
    if (pro === true){
      msg.className = 'restore-msg paid-msg ok'; msg.textContent = '¡Listo! Ya eres RÍO PRO.';
      setTimeout(() => { closePaywall(); closePlanPanel(); }, 1200);
    } else {
      msg.textContent = pro === null ? 'No hemos podido comprobarlo. Inténtalo en un momento.'
        : 'Aún no vemos tu pago. Si acabas de pagar, espera un minuto. Si pagaste con otro email, escríbenos a riopokerapp@gmail.com y lo activamos.';
    }
  }));
  document.getElementById('subscribeFromPlanBtn').addEventListener('click', () => openPayment(PAYMENT_LINK));

  // ---- Panel de Plan ----
  const planPanel = document.getElementById('planPanel');
  function openPlanPanel(){
    renderPlanInfo();
    refreshPhotoUsage();
    planPanel.classList.add('show');
  }
  function closePlanPanel(){ planPanel.classList.remove('show'); }
  document.getElementById('navPlan').addEventListener('click', () => { closeSidebar(); openPlanPanel(); });
  document.getElementById('closePlanPanel').addEventListener('click', closePlanPanel);
  planPanel.addEventListener('click', (e)=>{ if (e.target === planPanel) closePlanPanel(); });

  // ---- Barra lateral (menú) ----
  const sidebar = document.getElementById('sidebar');
  const sidebarOverlay = document.getElementById('sidebarOverlay');
  function openSidebar(){
    updateProfileUI();
    renderPlanInfo();
    refreshPhotoUsage();
    sidebar.classList.add('show'); sidebarOverlay.classList.add('show');
  }
  function closeSidebar(){ sidebar.classList.remove('show'); sidebarOverlay.classList.remove('show'); }
  document.getElementById('menuBtn').addEventListener('click', openSidebar);
  document.getElementById('closeSidebar').addEventListener('click', closeSidebar);
  sidebarOverlay.addEventListener('click', closeSidebar);
  document.getElementById('navAnalyzer').addEventListener('click', () => {
    closeSidebar(); window.scrollTo({top:0, behavior:'smooth'});
  });
  // ---- Configuración ----
  const settingsPanel = document.getElementById('settingsPanel');
  function openSettings(){
    updateProfileUI();
    document.getElementById('unitSelect').value = storageGet('rio_unit', 'fichas');
    document.getElementById('simQualitySelect').value = storageGet('rio_sim_quality', 'rapida');
    document.getElementById('saveHistoryToggle').checked = storageGet('rio_save_history', true);
    document.getElementById('rememberDefaultsToggle').checked = storageGet('rio_remember_defaults', true);
    renderPlanInfo();
    refreshPhotoUsage();
    settingsPanel.classList.add('show');
  }
  function closeSettings(){ settingsPanel.classList.remove('show'); }
  document.getElementById('navLogin').addEventListener('click', () => {
    closeSidebar(); openPaywall('login');
  });
  document.getElementById('navLogout').addEventListener('click', () => { closeSidebar(); doLogout(); });
  document.getElementById('acctCta').addEventListener('click', (e) => {
    const go = e.currentTarget.dataset.go;
    closeSidebar();
    if (go === 'login') openPaywall('login');
    else if (go === 'plans') openPlanPanel();
    else { openPlanPanel(); openBillingPortal(); }
  });
  document.getElementById('navManage').addEventListener('click', () => { closeSidebar(); openPlanPanel(); openBillingPortal(); });
  document.getElementById('navGlossary').addEventListener('click', () => { closeSidebar(); openGlossary(); });
  document.getElementById('manageSubBtn').addEventListener('click', openBillingPortal);
  document.getElementById('navSettings').addEventListener('click', () => { closeSidebar(); openSettings(); });
  // Packs con su precio a la vista en Tu plan (solo se pueden comprar con PRO).
  function renderPlanPacks(pro){
    const box = document.getElementById('planPackList');
    if (!box) return;
    const packs = activePacks();
    box.innerHTML = packs.map((pk, i) => `<div class="plan-pack">
        <span><b>+${pk.credits.toLocaleString('es-ES')} créditos</b> — ${pk.price}${pk.best ? ' <span class="pack-best">⭐ popular</span>' : ''}</span>
        ${pro ? `<button type="button" class="btn-secondary" data-plan-pack="${i}">Comprar</button>` : ''}
      </div>`).join('');
    document.getElementById('planPacksHint').textContent = pro
      ? 'Pago único · no caducan · se suman solos a tu cuenta.'
      : 'Solo para suscriptores PRO · pago único · no caducan.';
    box.querySelectorAll('[data-plan-pack]').forEach(b => b.addEventListener('click', () => openPayment(packs[Number(b.dataset.planPack)].link)));
  }
  document.getElementById('closeSettings').addEventListener('click', closeSettings);
  settingsPanel.addEventListener('click', (e)=>{ if (e.target === settingsPanel) closeSettings(); });

  const saveProfileBtn = document.getElementById('saveProfileBtn');
  saveProfileBtn.addEventListener('click', () => {
    saveProfileName(document.getElementById('profileNameInput').value);
    updateProfileUI();
    const old = saveProfileBtn.textContent;
    saveProfileBtn.textContent = '✅';
    setTimeout(() => { saveProfileBtn.textContent = old; }, 1200);
  });
  document.getElementById('profileNameInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') saveProfileBtn.click();
  });

  // ---- Lectura de capturas de mesa (beta) ----
  const VALID_POS = ['UTG','HJ','CO','BTN','SB','BB'];
  function parseCardToken(tok){
    if (!tok || tok.length < 2) return null;
    const rankMap = {A:14,K:13,Q:12,J:11,T:10,'9':9,'8':8,'7':7,'6':6,'5':5,'4':4,'3':3,'2':2};
    const rank = rankMap[tok[0].toUpperCase()];
    const suit = tok[1].toLowerCase();
    if (!rank || !SUITS.includes(suit)) return null;
    return { rank, suit };
  }
  // Una captura es una mano nueva: primero se vacía la anterior y luego se
  // rellena solo lo que la IA ha visto. Devuelve lo que no ha podido leer.
  function applyScreenshotData(data){
    seq = [[], [], [], []]; seqStreet = 0; seqActor = null; seqPending = null; selStreet = null;
    hole = [null, null]; board = [null, null, null, null, null];
    ['potInput', 'callInput', 'stackInput', 'villStackInput'].forEach(id => { document.getElementById(id).value = ''; });
    numRivals = 1; rivVal.textContent = numRivals;
    const used = new Set();
    const cardsOf = (str, n) => String(str || '').trim().split(/\s+/).map(parseCardToken)
      .filter(c => c && !used.has(cardKey(c)) && used.add(cardKey(c))).slice(0, n);
    cardsOf(data.hand, 2).forEach((c, i) => { hole[i] = c; });
    cardsOf(data.board, 5).forEach((c, i) => { board[i] = c; });
    const num = (v) => v != null && v !== '' && !isNaN(v) && Number(v) >= 0;
    if (num(data.pot)) document.getElementById('potInput').value = Number(data.pot);
    if (num(data.call)) document.getElementById('callInput').value = Number(data.call);
    if (num(data.heroStack)) document.getElementById('stackInput').value = Number(data.heroStack);
    if (num(data.villStack)) document.getElementById('villStackInput').value = Number(data.villStack);
    if (VALID_POS.includes(data.heroPos)) document.getElementById('heroPosInput').value = data.heroPos;
    if (VALID_POS.includes(data.villPos) && data.villPos !== data.heroPos) document.getElementById('villPosInput').value = data.villPos;
    if (data.numRivals){ numRivals = Math.max(1, Math.min(9, Number(data.numRivals) || 1)); rivVal.textContent = numRivals; }
    updateOrderHint();
    render();
    const missing = [];
    if (!hole[0] || !hole[1]) missing.push('tus cartas');
    if (!num(data.pot)) missing.push('el bote');
    if (!num(data.call)) missing.push('lo que te toca pagar');
    if (!VALID_POS.includes(data.heroPos)) missing.push('tu posición');
    return missing;
  }
  // Reduce la captura en el propio móvil antes de enviarla: las de móvil pesan
  // varios MB (Vercel rechaza envíos de más de ~4,5 MB) y a veces vienen en
  // formatos que la IA no acepta (HEIC). La IA trabaja con un máximo de ~1568 px
  // de lado, así que reducir a ese tamaño no pierde detalle.
  async function shrinkImage(file){
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise((resolve, reject) => {
        const i = new Image();
        i.onload = () => resolve(i);
        i.onerror = () => reject(new Error('Este formato de imagen no es compatible. Prueba con una captura de pantalla normal (PNG o JPG).'));
        i.src = url;
      });
      const MAX = 1568;
      const scale = Math.min(1, MAX / Math.max(img.naturalWidth, img.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      return { data: canvas.toDataURL('image/jpeg', 0.88).split(',')[1], mediaType: 'image/jpeg' };
    } finally { URL.revokeObjectURL(url); }
  }

  document.getElementById('screenshotInput').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    if (!isPro()){ openPaywall(); return; }
    const statusEl = document.getElementById('screenshotStatus');
    statusEl.style.display = 'block';
    statusEl.style.color = 'var(--cream-dim)';
    statusEl.textContent = 'Leyendo la imagen…';
    try{
      const small = await shrinkImage(file);
      statusEl.textContent = 'Analizando la mesa…';
      const resp = await fetch('/api/analyze-table', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ image: small.data, mediaType: small.mediaType })
      });
      let data = {};
      try { data = await resp.json(); } catch(e){}
      if (resp.status === 413) throw new Error('La imagen es demasiado grande. Prueba con una captura de pantalla en vez de una foto.');
      if (resp.status === 401){ logoutPro(); updateUsageBadge(); statusEl.style.color = 'var(--crimson)'; statusEl.textContent = '🔒 Inicia sesión con tu email de RÍO PRO para usar esta función.'; openPaywall('login'); return; }
      if (resp.status === 402){ statusEl.style.color = 'var(--crimson)'; statusEl.textContent = '🔒 Esta función es solo para suscriptores de RÍO PRO.'; openPaywall(); return; }
      if (resp.status === 403 && data.error === 'LIMIT_REACHED'){
        statusEl.style.color = 'var(--crimson)';
        statusEl.innerHTML = '📷 Te has quedado sin créditos de IA.';
        openCreditsModal(true);
        return;
      }
      if (!resp.ok || data.error) throw new Error(data.error || `No se pudo analizar la captura (error ${resp.status}).`);
      const missing = applyScreenshotData(data);
      statusEl.style.color = 'var(--ok)';
      const missText = missing.length ? ` No he podido leer: <b>${missing.join(', ')}</b>. Revísalo y complétalo a mano.` : '';
      if (hole[0] && hole[1]){
        statusEl.innerHTML = '✅ Mano nueva leída de la captura.' + missText + (missing.length ? '' : ' Calculando…');
        if (!missing.length) analyzeBtn.click();
      } else {
        const others = missing.filter(m => m !== 'tus cartas');
        statusEl.innerHTML = '⚠️ Mano nueva leída de la captura, pero no vi tus cartas con claridad: elígelas a mano.' +
          (others.length ? ` Tampoco he podido leer: <b>${others.join(', ')}</b>.` : '');
      }
    } catch(err){
      statusEl.style.color = 'var(--crimson)';
      statusEl.textContent = '⚠️ ' + (err.message || 'No se pudo leer la captura. Rellena los datos a mano.');
    }
  });

  function updateUnitHints(){
    const unit = storageGet('rio_unit', 'fichas');
    const label = unit === 'fichas' ? 'fichas' : unit;
    document.getElementById('potInput').nextElementSibling.textContent = `Bote actual, en ${label}`;
    document.getElementById('callInput').nextElementSibling.textContent = `Lo que cuesta pagar ahora, en ${label}`;
    document.getElementById('stackInput').nextElementSibling.textContent = `Lo que te queda delante, en ${label}`;
    document.getElementById('villStackInput').nextElementSibling.textContent = `Para el SPR efectivo, en ${label}`;
  }
  function simIterations(){ return storageGet('rio_sim_quality', 'rapida') === 'precisa' ? 5000 : 1500; }
  document.getElementById('unitSelect').addEventListener('change', (e) => {
    storageSet('rio_unit', e.target.value); updateUnitHints();
  });
  document.getElementById('simQualitySelect').addEventListener('change', (e) => {
    storageSet('rio_sim_quality', e.target.value);
  });
  document.getElementById('saveHistoryToggle').addEventListener('change', (e) => {
    storageSet('rio_save_history', e.target.checked);
  });
  document.getElementById('rememberDefaultsToggle').addEventListener('change', (e) => {
    storageSet('rio_remember_defaults', e.target.checked);
    if (!e.target.checked) storageSet('rio_defaults', null);
  });
  const clearHistoryBtn = document.getElementById('clearHistoryBtn');
  let clearArmed = false;
  clearHistoryBtn.addEventListener('click', () => {
    if (!clearArmed){
      clearArmed = true;
      clearHistoryBtn.textContent = '¿Seguro? Toca otra vez para borrar';
      clearHistoryBtn.style.color = 'var(--crimson)';
      clearHistoryBtn.style.borderColor = 'var(--crimson)';
      setTimeout(() => {
        clearArmed = false;
        clearHistoryBtn.textContent = 'Borrar historial de manos';
        clearHistoryBtn.style.color = ''; clearHistoryBtn.style.borderColor = '';
      }, 3000);
      return;
    }
    clearArmed = false;
    storageSet('rio_history', []); renderHistory();
    clearHistoryBtn.textContent = '✅ Historial borrado';
    clearHistoryBtn.style.color = 'var(--ok)'; clearHistoryBtn.style.borderColor = 'var(--ok)';
    setTimeout(() => {
      clearHistoryBtn.textContent = 'Borrar historial de manos';
      clearHistoryBtn.style.color = ''; clearHistoryBtn.style.borderColor = '';
    }, 1800);
  });
  updateUnitHints();
  // Inicio de sesión en dos pasos: 1) pedimos un código para el email,
  // 2) el usuario escribe el código y el servidor nos da un token de sesión.
  let pendingLoginEmail = null;
  async function postJson(url, body){
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    let data = {};
    try { data = await r.json(); } catch(e){}
    return { ok: r.ok, status: r.status, data };
  }
  function showLoginStep(){
    const onCode = !!pendingLoginEmail;
    const codeInput = document.getElementById('proCode');
    codeInput.style.display = onCode ? 'block' : 'none';
    document.getElementById('restoreBtn').textContent = onCode ? 'Verificar código' : 'Enviarme un código';
    document.getElementById('restoreHint').textContent = onCode
      ? `Te enviamos un código a ${pendingLoginEmail}. Escríbelo aquí (caduca en 10 minutos):`
      : 'Escribe tu email y te enviamos un código para entrar. Si aún no tienes cuenta, se crea gratis:';
    if (onCode) codeInput.focus();
  }
  // Si cambia el email, volvemos al primer paso.
  document.getElementById('proEmail').addEventListener('input', () => {
    if (pendingLoginEmail){ pendingLoginEmail = null; showLoginStep(); }
  });
  document.getElementById('restoreBtn').addEventListener('click', async () => {
    const msg = document.getElementById('restoreMsg');
    const btn = document.getElementById('restoreBtn');
    const fail = (text) => { msg.textContent = text; msg.className = 'restore-msg no'; };
    btn.disabled = true; btn.textContent = 'Comprobando…';
    msg.textContent = ''; msg.className = 'restore-msg';
    try {
      if (!pendingLoginEmail){
        const email = document.getElementById('proEmail').value.trim().toLowerCase();
        if (!email || !email.includes('@')){ fail('Escribe un email válido.'); return; }
        const { ok, data } = await postJson('/api/send-code', { email });
        if (!ok){ fail(data.error || 'No se pudo enviar el código. Inténtalo de nuevo.'); return; }
        pendingLoginEmail = email;
        msg.textContent = 'Código enviado. Revisa tu correo (y la carpeta de spam).';
        msg.className = 'restore-msg ok';
      } else {
        const code = document.getElementById('proCode').value.trim();
        if (!/^\d{6}$/.test(code)){ fail('Escribe el código de 6 dígitos.'); return; }
        const { ok, status, data } = await postJson('/api/verify-code', { email: pendingLoginEmail, code, src: rawStorage('rio_src') });
        if (!ok){
          if (status === 429) pendingLoginEmail = null; // demasiados intentos: hay que pedir otro código
          fail(data.error || 'No se pudo comprobar el código.');
          return;
        }
        storageSet('rio_token', data.token);
        storageSet('rio_email', data.email);
        storageSet('rio_pro', !!data.pro);
        pendingLoginEmail = null;
        document.getElementById('proCode').value = '';
        refreshPhotoUsage(); refreshFreeLeft(); pullSync();
        msg.textContent = data.pro ? '¡Suscripción activa! Desbloqueando RÍO PRO…' : '¡Cuenta lista! Ya puedes usar tus análisis gratis.';
        msg.className = 'restore-msg ok';
        updateUsageBadge(); renderHistory();
        if (pendingPayment){
          // Acaba de entrar para pagar: botón para seguir (abrir el pago necesita un toque del usuario).
          const link = pendingPayment; pendingPayment = null;
          msg.innerHTML = data.pro ? '¡Ya eres RÍO PRO!' : '¡Cuenta lista! <button type="button" class="btn-primary" id="goPayBtn" style="width:100%; margin-top:10px;">Continuar al pago →</button>';
          const go = document.getElementById('goPayBtn');
          if (go) go.addEventListener('click', () => { openPayment(link); closePaywall(); });
          else setTimeout(closePaywall, 1200);
          return;
        }
        const resume = pendingAnalyze;
        setTimeout(() => { closePaywall(); if (resume) analyzeBtn.click(); }, 900);
      }
    } catch(e){
      fail('No se pudo contactar con el servidor. Inténtalo de nuevo en unos segundos.');
    } finally {
      btn.disabled = false;
      showLoginStep();
    }
  });

  updateUsageBadge();
  renderHistory();
  getProfile();

  const analyzeBtn = document.getElementById('analyzeBtn');
  analyzeBtn.addEventListener('click', async () => {
    if (!hole[0] || !hole[1]){ alert('Elige tus dos cartas antes de analizar.'); return; }
    if (analysisStreet() >= cardStreets()){
      alert(`Para analizar el ${STREET_NAMES[analysisStreet()].toLowerCase()} añade antes sus cartas.`);
      const idx = board.findIndex(c => !c); if (idx !== -1) openPicker('board', idx);
      return;
    }
    const sharedRun = freeRun || isDemoHand(); freeRun = false; // manos compartidas y la de ejemplo no gastan análisis
    let trialRun = false;
    if (!isPro() && !sharedRun && !storageGet('rio_token', '')){
      // Sin cuenta: 1 análisis de prueba; después, cuenta gratis para 10 más.
      if (storageGet('rio_anon_used', false)){ openPaywall('free'); pendingAnalyze = true; return; }
      storageSet('rio_anon_used', true); trialRun = true;
    }
    document.getElementById('trialNudge').style.display = trialRun ? 'block' : 'none';
    if (!isPro() && !sharedRun && !trialRun){
      // Los análisis gratis van ligados a una cuenta y los cuenta el servidor.
      if (!storageGet('rio_token', '')){ openPaywall('free'); pendingAnalyze = true; return; }
      analyzeBtn.disabled = true; analyzeBtn.textContent = 'Comprobando…';
      try {
        const r = await fetch('/api/free-use', { method: 'POST', headers: authHeaders() });
        let d = {}; try { d = await r.json(); } catch(e){}
        if (r.status === 401){ logoutPro(); analyzeBtn.disabled = false; analyzeBtn.textContent = 'Analizar mano'; updateUsageBadge(); openPaywall('free'); pendingAnalyze = true; return; }
        if (r.status === 402){ storageSet('rio_free_left', 0); analyzeBtn.disabled = false; analyzeBtn.textContent = 'Analizar mano'; updateUsageBadge(); openPaywall(); return; }
        if (d.pro) storageSet('rio_pro', true);
        else if (typeof d.left === 'number') storageSet('rio_free_left', d.left);
      } catch(e){ /* sin conexión: dejamos analizar */ }
    }
    analyzeBtn.disabled = true; analyzeBtn.textContent = 'Calculando…';
    trackEvent('analisis');
    setTimeout(() => {
      const pot = Math.max(0, Number(document.getElementById('potInput').value) || 0);
      const call = Math.max(0, Number(document.getElementById('callInput').value) || 0);
      const aStreet = analysisStreet();
      const aBoard = boardAt(aStreet);
      const vPool = villainPoolAt(decisionPoint());
      const res = runEquity(hole, aBoard, numRivals, simIterations(), vPool);
      const { win, tie } = res;
      const needed = (pot+call) > 0 ? (call/(pot+call))*100 : 0;

      // Guardado para el simulador de "¿y si me suben otra vez?"
      lastWin = win; lastTie = tie;
      document.getElementById('reraisePanel').style.display = 'none';
      document.getElementById('reraiseResult').innerHTML = '';
      document.getElementById('reraisePotInput').value = '';
      document.getElementById('reraiseCallInput').value = '';

      const known = [...hole, ...aBoard].filter(Boolean);
      const filledBoard = aBoard;
      document.querySelector('#resultPanel .panel-head h2').textContent = 'Resultado · ' + STREET_NAMES[aStreet];
      let handLabel, handSub = '';
      let currentCat = null;
      if (known.length < 5){
        const [a,b] = hole;
        handLabel = a.rank===b.rank ? 'Pareja de '+RANK_PLURAL[a.rank] : RANK_LABEL(Math.max(a.rank,b.rank))+'-'+RANK_LABEL(Math.min(a.rank,b.rank))+(a.suit===b.suit?' (mismo palo)':'');
        handSub = `Top ${Math.max(1, Math.round(handTopPercent(a, b)))}% de manos iniciales`;
      } else {
        const best = bestHand(known);
        currentCat = best.category;
        handLabel = categoryName(best.category, best.tiebreak);
      }
      const villActed = vPool.length < poolFromSet(villRange.set).length;
      const rangeText = !res.usedRange ? 'cualquier mano'
        : villActed ? `rango ajustado a sus apuestas, ~${Math.max(1, Math.round(vPool.length / 1326 * 100))}%`
        : rangeLabel().toLowerCase();
      handSub = (handSub ? handSub + ' · ' : '') + `vs ${numRivals} rival${numRivals>1?'es':''} (${rangeText})`;
      document.getElementById('resultHandName').innerHTML = `${handLabel}<small>${handSub}</small>`;
      lastHandLabel = handLabel;

      const badge = document.getElementById('decisionBadge');
      const heroPos = document.getElementById('heroPosInput').value;
      const villPos = document.getElementById('villPosInput').value;
      const oop = heroIsOOP();
      lastOop = oop;
      // Fuera de posición exige más margen; sin apuesta que pagar, apostamos si vamos
      // claramente por encima de nuestra parte "justa" del bote (ver decide()).
      const fairShare = 100/(numRivals+1);
      // Torneo: jugarte buena parte del stack cuesta más (te pueden eliminar).
      const tourney = storageGet('rio_game', 'cash') === 'torneo';
      const stackNow = Math.max(0, Number(document.getElementById('stackInput').value) || 0);
      const riskPremium = tourney && stackNow > 0 && call >= stackNow * 0.3 ? 5 : 0;
      const dp = decisionPoint();
      const unraised = aStreet === 0 && (seq[0].length ? replay(0, dp && dp.s === 0 ? dp : undefined).raises === 0 : call <= bbSize());
      const reco = recommend({ heroCards: hole, boardCards: aBoard, pot, toCall: call, rivals: numRivals, pool: vPool, oop, street: aStreet,
        heroPos, unraised, premium: riskPremium, eq: win + tie / 2 });
      const text = reco.text;
      const cls = { RAISE: 'ok', BET: 'ok', CALL: 'warn', CHECK: 'warn', FOLD: 'no' }[text];
      const bluff = reco.bc || null;
      const isBluff = reco.kind === 'bluff', isOpen = reco.kind === 'open';
      const heroDraw = aStreet > 0 && aStreet < 3 && hasDraw(hole, aBoard);
      badge.innerHTML = ({ ok: '🟢', warn: '🟡', no: '🔴' })[cls] + ' ' + decisionHTML(text);
      badge.className = 'decision-badge ' + cls;

      // --- Explicación modo Pro ---
      const posPhrase = oop
        ? `Vas fuera de posición (${heroPos} vs ${villPos}): actúas antes que tu rival, así que juegas con menos información`
        : `Tienes posición (${heroPos} vs ${villPos}): tu rival actúa primero, así que ves lo que hace antes de decidir`;
      const vsRange = res.usedRange ? (villActed ? ` contra su ${rangeText}` : ` contra un rango ${rangeText}`) : '';
      const edge = (win - needed).toFixed(1).replace('.', ',');
      let proText;
      const evLine = bluff ? ` Apostar 2/3 del bote: el rival se retira ~<b>${Math.round(bluff.f * 100)}%</b>, cuando paga ganas ~<b>${Math.round(bluff.eqCall * 100)}%</b> · EV apostar <b>${bluff.evBet >= 0 ? '+' : ''}${bluff.evBet.toFixed(1).replace('.', ',')}</b> vs pasar <b>${bluff.evCheck.toFixed(1).replace('.', ',')}</b>.` : '';
      if (text === 'BET'){
        proText = `Nadie ha apostado y tu equity${vsRange} es <b>${win.toFixed(1).replace('.', ',')}%</b> (parte justa del bote: ${fairShare.toFixed(0)}%). Apuesta por valor: las manos peores te pagan.${evLine} ${posPhrase}.`;
      } else if (text === 'CHECK'){
        proText = `No hay nada que igualar y tu equity${vsRange} es <b>${win.toFixed(1).replace('.', ',')}%</b>. Apostar no rinde más que pasar: las manos peores se retiran y las mejores te pagan.${evLine} Pasa y ve la siguiente carta gratis. ${posPhrase}.`;
      } else if (text === 'RAISE' && reco.valueCheck){
        proText = `Tu equity${vsRange} (<b>${win.toFixed(1).replace('.', ',')}%</b>) supera el <b>${needed.toFixed(1).replace('.', ',')}%</b> necesario y además ganas ~<b>${Math.round(reco.valueCheck)}%</b> contra la parte fuerte de su rango, la que te pagaría una subida. ${posPhrase}.`;
      } else if (text === 'RAISE'){
        proText = `Tu equity${vsRange} (<b>${win.toFixed(1).replace('.', ',')}%</b>) supera con margen el <b>${needed.toFixed(1).replace('.', ',')}%</b> que necesitas para igualar. ${posPhrase}${oop ? ', por eso conviene un margen mayor antes de subir, pero aun así vas claramente por delante' : ', así que puedes presionar con un margen más ajustado'}.`;
      } else if (text === 'CALL' && reco.downgraded){
        proText = `Tu equity${vsRange} (<b>${win.toFixed(1).replace('.', ',')}%</b>) supera de sobra el <b>${needed.toFixed(1).replace('.', ',')}%</b> necesario, pero contra la parte fuerte de su rango (la que pagaría una subida) solo ganas ~<b>${Math.round(reco.valueCheck)}%</b>: subir solo te lo pagarían las manos que te ganan. <b>Paga</b> y no hinches el bote. ${posPhrase}.`;
      } else if (text === 'CALL'){
        proText = `Estás cerca del punto de equilibrio (diferencia de ${edge}%${vsRange}). ${posPhrase}. ${oop ? 'Fuera de posición conviene ser algo más conservador: iguala pero no metas más fichas todavía.' : 'Con posición puedes igualar tranquilo y decidir la siguiente calle ya con más información.'}`;
      } else {
        proText = `Necesitas <b>${needed.toFixed(1).replace('.', ',')}%</b> de equity para que pagar sea rentable y solo tienes <b>${win.toFixed(1).replace('.', ',')}%</b>${vsRange}. ${posPhrase}${oop ? ', lo que hace aún más difícil defenderte sin esa equity' : ''}. Salvo que tengas otras razones (faroles, lectura del rival), lo correcto es retirarse aquí.`;
      }

      if (isBluff){
        proText = `Nadie ha apostado y cuando te pagan vas por detrás, pero una apuesta de 2/3 del bote hace retirarse al rival ~<b>${Math.round(bluff.f * 100)}%</b> de las veces${heroDraw ? ' y, si paga, aún tienes proyecto' : ''}. EV de apostar <b>${bluff.evBet >= 0 ? '+' : ''}${bluff.evBet.toFixed(1).replace('.', ',')}</b> frente a <b>${bluff.evCheck.toFixed(1).replace('.', ',')}</b> pasando: ${heroDraw ? 'semifarol' : 'farol'} rentable. ${posPhrase}.`;
      }
      if (isOpen){
        proText = text === 'RAISE'
          ? `Preflop sin subidas: ${handLabel} está en el <b>top ${Math.max(1, Math.round(reco.top))}%</b> y desde ${heroPos} se abre ~<b>${OPEN_PCT[heroPos]}%</b>. Abre subiendo a unas 2,5–3 ciegas grandes (no te limites a pagar la ciega).`
          : `Preflop sin subidas: ${handLabel} está en el <b>top ${Math.round(reco.top)}%</b> y desde ${heroPos} solo se abre ~<b>${OPEN_PCT[heroPos]}%</b> de las manos. Tírala.`;
      }
      if (riskPremium) proText += ` <b>Torneo:</b> pagar supone más del 30% de tu stack, así que exigimos ~5% más de equity por el riesgo de quedar eliminado.`;

      // --- Explicación modo Fácil ---
      const of20 = (p) => { const n = Math.round(p/5); return n === 0 && p > 0 ? 'menos de 1' : String(n); };
      const posEasy = oop
        ? 'Además hablas antes que tu rival, lo que es una pequeña desventaja.'
        : 'Hablas después que tu rival: es una ventaja, porque ves lo que hace antes de decidir.';
      let easyText;
      if (text === 'BET') easyText = `Nadie ha apostado y tu mano es fuerte: ganas unas <b>${of20(win)} de cada 20</b> veces. Apuesta tú para que te paguen cuando vas por delante.`;
      else if (text === 'CHECK') easyText = `Nadie ha apostado, así que puedes <b>pasar gratis</b> y ver la siguiente carta. Tu mano no es tan fuerte como para apostar.`;
      else if (text === 'RAISE') easyText = `Vas claramente por delante: ganas unas <b>${of20(win)} de cada 20</b> veces y te bastaría con <b>${of20(needed)}</b>. Sube para ganar más fichas. ${posEasy}`;
      else if (text === 'CALL') easyText = `Está justo: ganas unas <b>${of20(win)} de cada 20</b> veces y necesitas <b>${of20(needed)}</b>. Paga, pero sin meter más fichas por ahora. ${posEasy}`;
      else easyText = `Pagar te haría perder fichas a la larga: ganas solo <b>${of20(win)} de cada 20</b> veces y necesitarías <b>${of20(needed)}</b>. Lo mejor es tirar la mano. ${posEasy}`;
      if (isOpen) easyText = text === 'RAISE'
        ? `Nadie ha subido todavía y tu mano es de las que se juegan desde <b>${heroPos}</b> (top ${Math.max(1, Math.round(reco.top))}%). <b>Sube</b> a unas 3 ciegas grandes: no te limites a pagar.`
        : `Nadie ha subido todavía, pero desde <b>${heroPos}</b> esta mano no se suele jugar (top ${Math.round(reco.top)}%; se juega el ${OPEN_PCT[heroPos]}% mejor). <b>Tírala</b> sin miedo.`;
      if (text === 'CALL' && reco.downgraded) easyText = `Vas por delante de muchas de sus manos, pero si subes solo te pagarían las que te ganan. <b>Paga</b> y no metas más fichas: ganas unas <b>${of20(win)} de cada 20</b> veces y necesitas <b>${of20(needed)}</b>. ${posEasy}`;
      if (isBluff) easyText = `Tu mano no es la mejor ahora, pero si apuestas tu rival se retirará unas <b>${of20(bluff.f * 100)} de cada 20</b> veces${heroDraw ? ', y si paga aún puedes ligar tu proyecto' : ''}. Es un <b>${heroDraw ? 'semifarol' : 'farol'}</b> que compensa.`;
      if (riskPremium) easyText += ' Como es un <b>torneo</b> y te juegas buena parte de tus fichas, pedimos un poco más de ventaja: si pierdes, quedas fuera.';
      document.getElementById('adviceBox').innerHTML = `<div class="easy-only">${easyText}</div><div class="pro-only">${proText}</div>`;

      // Puntos: cada uno es una de cada 20 veces
      const wDots = Math.round(win/5), tDots = Math.min(20 - wDots, Math.round(tie/5));
      document.getElementById('oddsDots').innerHTML = Array.from({length: 20}, (_, i) =>
        `<i class="${i < wDots ? 'w' : i < wDots + tDots ? 't' : ''}" style="animation-delay:${i*25}ms"></i>`).join('');
      document.getElementById('plainLine').innerHTML = `De cada 20 veces así, ganas <b>${of20(win)}</b>` +
        (call > 0 ? ` y para que pagar compense necesitas ganar <b>${of20(needed)}</b>.` : '.');

      requestAnimationFrame(() => {
        document.getElementById('gaugeFill').style.width = Math.max(2, Math.min(100, win)) + '%';
        document.getElementById('gaugeMark').style.left = Math.max(0, Math.min(100, needed)) + '%';
      });
      document.getElementById('markLabel').textContent = call > 0 ? `Necesitas ${needed.toFixed(0)}%` : 'Sin coste';

      const lose = Math.max(0, 100 - win - tie);
      const outsCards = findOuts(hole, filledBoard);
      const outs = outsCards ? outsCards.length : null;

      document.getElementById('statEquity').textContent = win.toFixed(1).replace('.', ',')+'%';
      document.getElementById('statTie').textContent = tie.toFixed(1).replace('.', ',')+'%';
      document.getElementById('statLose').textContent = lose.toFixed(1).replace('.', ',')+'%';
      document.getElementById('statOuts').textContent = outs===null ? '—' : outs+' cartas';
      document.getElementById('statNeeded').textContent = call>0 ? needed.toFixed(1).replace('.', ',')+'%' : '—';
      document.getElementById('statRange').textContent = res.usedRange ? Math.max(1, Math.round(vPool.length / 1326 * 100))+'%' : '100%';

      // Cartas que te ayudan
      const outsBox = document.getElementById('outsBox');
      outsBox.style.display = outsCards && outsCards.length ? 'block' : 'none';
      if (outsCards){
        document.getElementById('outsList').innerHTML = outsCards
          .sort((x, y) => y.rank - x.rank || SUITS.indexOf(x.suit) - SUITS.indexOf(y.suit))
          .map(c => `<span class="mini-card${SUIT_CRIMSON[c.suit] ? ' crimson' : ''}">${RANK_LABEL(c.rank)}<span>${SUIT_SYMBOL[c.suit]}</span></span>`).join('');
      }

      // Con qué jugada puedes acabar (solo si quedan cartas por salir)
      const finalsWrap = document.getElementById('finalsWrap');
      finalsWrap.style.display = filledBoard.length < 5 ? 'block' : 'none';
      if (filledBoard.length < 5){
        const CAT_NAMES = ['Carta alta','Pareja','Doble pareja','Trío','Escalera','Color','Full','Póker','Escalera de color'];
        const rows = [];
        for (let c = 8; c >= 0; c--){
          const p = res.cats[c];
          if (p < 0.05 && c !== currentCat) continue;
          rows.push(`<div class="final-row${c === currentCat ? ' current' : ''}"><span>${CAT_NAMES[c]}</span><div class="bar"><i style="width:${Math.max(1, p)}%"></i></div><b>${p < 1 ? p.toFixed(1).replace('.', ',') : Math.round(p)}%</b></div>`);
        }
        document.getElementById('finalsBox').innerHTML = rows.join('');
      }

      const stack = Math.max(0, Number(document.getElementById('stackInput').value) || 0);
      const villStack = Math.max(0, Number(document.getElementById('villStackInput').value) || 0);
      const effStack = villStack>0 ? Math.min(stack, villStack) : stack;
      document.getElementById('statRatio').textContent = call>0 ? (pot/call).toFixed(1).replace('.', ',')+' : 1' : '—';
      const effWin = (win + tie/2) / 100;
      const ev = call>0 ? (effWin*pot - (1-effWin)*call) : 0;
      const evEl = document.getElementById('statEV');
      const unitLabel = storageGet('rio_unit', 'fichas');
      const evUnitSuffix = unitLabel === 'fichas' ? '' : ' ' + unitLabel;
      evEl.textContent = call>0 ? (ev>=0 ? '+' : '') + ev.toFixed(1).replace('.', ',') + evUnitSuffix : '—';
      evEl.style.color = call>0 ? (ev>=0 ? 'var(--ok)' : 'var(--crimson)') : 'var(--cream)';
      document.getElementById('statSPR').textContent = (effStack>0 && pot>0) ? (effStack/pot).toFixed(1).replace('.', ',') : '—';

      // Lo esencial, justo debajo de la decisión: cuánto ganas de media y tus opciones frente a lo que necesitas.
      const inBB = seqHasActions();
      const fmtEV = (v) => (v >= 0 ? '+' : '') + (inBB ? (v / bbSize()).toFixed(1).replace('.', ',') + ' BB' : v.toFixed(1).replace('.', ',') + ' ' + unitLabel);
      const evShown = call > 0 ? ev : bluff && (text === 'BET') ? bluff.evBet : null;
      const kchips = [];
      kchips.push(`<div class="kchip"><b>${Math.round(win)}%</b><span class="easy-only">Ganas</span><span class="pro-only">Equity</span></div>`);
      if (call > 0) kchips.push(`<div class="kchip"><b>${Math.round(needed)}%</b><span class="easy-only">Necesitas</span><span class="pro-only">Pot odds</span></div>`);
      if (evShown !== null) kchips.push(`<div class="kchip ${evShown >= 0 ? 'pos' : 'neg'}"><b>${fmtEV(evShown)}</b><span class="easy-only">${call > 0 ? 'de media si pagas' : 'de media si apuestas'}</span><span class="pro-only">${call > 0 ? 'EV de pagar' : 'EV de apostar'}</span></div>`);
      if (aStreet > 0 && aStreet < 3 && outs !== null) kchips.push(`<div class="kchip"><b>${outs}</b><span class="easy-only">Cartas que te ayudan</span><span class="pro-only">Outs</span></div>`);
      document.getElementById('keyLine').innerHTML = kchips.join('');

      // --- ¿Por qué? En pocas frases cortas: equity, precio, rival, proyectos, riesgo ---
      const pctS = (x) => Math.round(x) + '%';
      const absEV = (v) => fmtEV(Math.abs(v)).slice(1);
      const why = [];
      if (isOpen){
        why.push(`🃏 ${handLabel} está en el <b>top ${Math.max(1, Math.round(reco.top))}%</b> de manos iniciales.`);
        why.push(`📍 Desde <b>${heroPos}</b> se suele abrir ~<b>${OPEN_PCT[heroPos]}%</b> de las manos: ${text === 'RAISE' ? 'la tuya entra.' : 'la tuya se queda fuera.'}`);
        if (text === 'RAISE') why.push('💰 Sube a unas 3 ciegas grandes: si solo pagas la ciega, regalas la iniciativa.');
      } else if (call > 0){
        why.push(`🎯 Ganas ~<b>${pctS(win)}</b> de las veces y necesitas <b>${pctS(needed)}</b> para que pagar compense.`);
        why.push(`💰 Pagas <b>${fmtN(call)}</b> para un bote de <b>${fmtN(pot + call)}</b>: pagar ${ev >= 0 ? 'gana' : 'pierde'} de media <b>${absEV(ev)}</b>.`);
        if (reco.downgraded) why.push(`⚠️ Contra sus manos fuertes (las que pagarían una subida) solo ganas ~<b>${Math.round(reco.valueCheck)}%</b>: paga, pero no subas.`);
        else if (text === 'RAISE' && reco.valueCheck) why.push(`💪 Incluso contra sus manos fuertes ganas ~<b>${Math.round(reco.valueCheck)}%</b>: sube para cobrar más.`);
      } else {
        why.push(`🎯 Nadie ha apostado y ganas ~<b>${pctS(win)}</b> contra sus manos.`);
        if (isBluff) why.push(`🎭 Si apuestas 2/3 del bote, se retira ~<b>${Math.round(bluff.f * 100)}%</b> de las veces: ${heroDraw ? 'semifarol rentable, y si paga aún puedes ligar' : 'farol rentable'}.`);
        else if (text === 'BET') why.push('💰 Apostar gana más que pasar: las manos peores te pagan.');
        else why.push('🤚 Apostar no gana más que pasar: las peores se retirarían y solo te pagarían las mejores.');
      }
      if (!isOpen && res.usedRange) why.push(villActed
        ? `🧠 Por cómo ha apostado, tu rival suele tener manos fuertes: ~${Math.max(1, Math.round(vPool.length / 1326 * 100))}% de todas.`
        : villRange.unknown ? '🧠 No sabemos cómo juega tu rival, así que suponemos un jugador medio (~40% de las manos).'
        : villRange.set.size >= 169 ? '🧠 Tu rival juega casi cualquier mano.'
        : `🧠 Tu rival juega ~${Math.round(villRange.pct)}% de las manos${villRange.custom ? ' (tu selección)' : ''}.`);
      if (aStreet > 0 && aStreet < 3 && outs) why.push(`🃏 Tienes <b>${outs} ${outs === 1 ? 'carta' : 'cartas'}</b> que mejoran tu jugada en la próxima calle.`);
      if (!isOpen && why.length < 5) why.push(oop ? '📍 Hablas antes que tu rival: juegas con menos información.' : '📍 Hablas después que tu rival: ves lo que hace antes de decidir.');
      if (riskPremium) why.push('🏆 Torneo: te juegas buena parte de tu stack, así que pedimos algo más de ventaja.');
      document.getElementById('whyTitle').innerHTML = `¿Por qué RÍO recomienda ${decisionHTML(text)}?`;
      document.getElementById('whyList').innerHTML = why.map(x => `<li>${x}</li>`).join('');

      // --- Plan: cuánto apostar y qué hacer si te suben ---
      const curStreet = availableStreets() - 1;
      const heroPut = text === 'RAISE' ? call * 3 : text === 'BET' ? pot * 2 / 3 : text === 'CALL' ? call : 0;
      const villMatch = text === 'RAISE' ? heroPut - call : text === 'BET' ? heroPut : 0;
      const potAfter = pot + heroPut;
      const strongPool = raisingPool(vPool, curStreet, text === 'CHECK' ? 0.65 : 0.22);
      const e2raw = runEquity(hole, aBoard, numRivals, 1000, strongPool);
      const e2 = Math.max(0, (e2raw.win + e2raw.tie / 2) - (oop ? 3 : 0)) / 100;
      lastE2 = e2 * 100;
      const eCap = Math.min(e2, 0.49);
      const maxCall = e2 >= 0.55 ? Infinity : eCap * (potAfter + villMatch) / (1 - 2 * eCap);
      const behind = effStack > 0 ? Math.max(0, effStack - heroPut) : 0;
      const u = unitLabel === 'fichas' ? '' : ' ' + unitLabel;
      const limit = e2 >= 0.45 && e2 < 0.55 && !(behind > 0 && maxCall >= behind)
        ? `puedes <b>pagar casi cualquier resubida</b>: contra su rango fuerte ganas ~${Math.round(e2*100)}%, casi la mitad de las veces`
        : maxCall === Infinity || (behind > 0 && maxCall >= behind)
        ? `<b>paga aunque vaya all-in</b>: sigues por delante incluso contra su rango fuerte (ganas ~${Math.round(e2*100)}%)`
        : maxCall < Math.max(1, pot * 0.1)
          ? `<b>retírate</b> salvo que la subida sea mínima: contra su rango fuerte solo ganas ~${Math.round(e2*100)}%`
          : `paga si te toca poner <b>hasta ${fmtN(Math.round(maxCall))}${u}</b> más; si es más, <b>retírate</b> (contra su rango fuerte ganas ~${Math.round(e2*100)}%)`;
      let planItems = [];
      if (text === 'BET' && isBluff) planItems.push(`Apuesta unas <b>${fmtN(Math.round(heroPut))}${u}</b> (2/3 del bote) de ${heroDraw ? 'semifarol' : 'farol'}.`, heroDraw ? 'Si te suben, paga solo si te sale barato: tu proyecto aún puede ligar.' : 'Si te suben, <b>retírate</b>: el farol no ha funcionado.');
      else if (text === 'BET') planItems.push(`Apuesta unas <b>${fmtN(Math.round(heroPut))}${u}</b> (2/3 del bote).`, `Si te suben: ${limit}.`);
      else if (text === 'RAISE' && isOpen) planItems.push(`Abre subiendo a unas <b>${fmtN(Math.round(bbSize() * 3 * 100) / 100)}${u}</b> (3 ciegas grandes).`, `Si te resuben: ${limit}.`);
      else if (text === 'RAISE') planItems.push(`Sube a unas <b>${fmtN(Math.round(heroPut))}${u}</b> (3 veces su apuesta).`, `Si te resuben: ${limit}.`);
      else if (text === 'CALL') planItems.push(`Paga <b>${fmtN(call)}${u}</b>.`, `Si alguien vuelve a subir después: ${limit}.`, curStreet < 3 ? 'En la siguiente calle, vuelve a analizar con la carta nueva: pulsa <b>Siguiente calle</b>.' : '');
      else if (text === 'CHECK') planItems.push('Pasa.', `Si después tu rival apuesta: ${limit}.`);
      else planItems.push('Tira la mano: no hay plan que la salve a este precio.');
      if (tourney && !stackNow) planItems.push('Torneo: escribe <b>tu stack</b> para ajustar el consejo al riesgo de quedar eliminado.');
      document.getElementById('planBox').innerHTML = `<div class="plan-title">📋 Tu plan</div><ul>${planItems.filter(Boolean).map(x => `<li>${x}</li>`).join('')}</ul>`;
      const verdict = text === 'CALL' ? `pagar <b>${fmtN(call)}${u}</b>`
        : text === 'RAISE' && isOpen ? `subir a <b>${fmtN(Math.round(bbSize() * 3 * 100) / 100)}${u}</b>`
        : text === 'RAISE' ? `subir a unas <b>${fmtN(Math.round(heroPut))}${u}</b>`
        : text === 'BET' ? `apostar unas <b>${fmtN(Math.round(heroPut))}${u}</b>`
        : text === 'CHECK' ? '<b>pasar</b>' : '<b>tirar la mano</b>';
      document.getElementById('verdictLine').innerHTML = `RÍO recomienda ${verdict}`;

      const reviewRows = seqHasActions() ? reviewDecisions() : [];
      renderTimeline(reviewRows);
      saveReviews(reviewRows);
      document.getElementById('streetTrack').innerHTML = STREET_NAMES.map((n, i) =>
        `<span class="${i === aStreet ? 'cur' : i < aStreet ? 'done' : ''}">${i < aStreet ? '✓ ' : ''}${n}</span>`).join('<i>→</i>');
      const nsBtn = document.getElementById('nextStreetBtn');
      nsBtn.style.display = curStreet < 3 && text !== 'FOLD' ? 'block' : 'none';
      nsBtn.textContent = `➡️ Siguiente calle: ${['añadir el flop', 'añadir el turn', 'añadir el river'][Math.min(2, curStreet)]}`;

      resultPanel.classList.add('show');
      analyzeBtn.disabled = false; analyzeBtn.textContent = 'Analizar mano';
      resultPanel.scrollIntoView({behavior:'smooth', block:'start'});
      updateSticky();
      const demo = isDemoHand();
      document.getElementById('demoNext').style.display = demo ? 'block' : 'none';
      document.getElementById('moreNudge').style.display = demo ? 'none' : '';
      renderWhatIf({ aStreet, aBoard, dp, pot, call, oop, heroPos, unraised, premium: riskPremium, isOpen, text });

      // Tu jugada en esa mano (solo si apuntaste lo que hiciste en la secuencia): la peor nota.
      const worst = reviewRows.reduce((w, r) => (!w || ['ok', 'meh', 'bad'].indexOf(r.g) > ['ok', 'meh', 'bad'].indexOf(w.g)) ? r : w, null);
      pushHistory({
        hand: handLabel, equity: win.toFixed(1), rivals: numRivals,
        decision: text, cls: cls, t: Date.now(), st: aStreet,
        ev: evShown === null ? null : Math.round((inBB ? evShown / bbSize() : evShown) * 10) / 10, evU: inBB ? 'BB' : unitLabel,
 g: worst ? worst.g : null, act: worst ? worst.act : null,
        hp: heroPos, vp: villPos, game: tourney ? 'torneo' : 'cash',
        when: new Date().toLocaleTimeString('es-ES', {hour:'2-digit', minute:'2-digit'})
      });
      updateUsageBadge();
      renderHistory();

      if (storageGet('rio_remember_defaults', true)){
        storageSet('rio_defaults', { heroPos, villPos, numRivals });
      }

      lastSummary = `RÍO — Análisis de mano\nMano: ${handLabel}\nPosiciones: tú ${heroPos} vs rival ${villPos}\nRango del rival: ${res.usedRange ? rangeLabel() : 'cualquier mano'}\nGanar ${win.toFixed(1).replace('.', ',')}% · Empatar ${tie.toFixed(1).replace('.', ',')}% · Perder ${lose.toFixed(1).replace('.', ',')}%\nOuts: ${outs===null?'—':outs}\nOdds necesarias: ${call>0?needed.toFixed(1).replace('.', ',')+'%':'—'} · Ratio del bote: ${call>0?(pot/call).toFixed(1).replace('.', ',')+':1':'—'}\nEV de igualar: ${call>0?(ev>=0?'+':'')+ev.toFixed(1).replace('.', ','):'—'}\nDecisión: ${text} (${DECISION_ES[text]})`;
    }, 30);
  });

  // ---- Mano de ejemplo: para probar RÍO sin saber aún cómo meter una mano ----
  const DEMO = { hole: [{ rank: 14, suit: 's' }, { rank: 5, suit: 's' }], board: [{ rank: 13, suit: 's' }, { rank: 8, suit: 'd' }, { rank: 3, suit: 's' }],
    heroPos: 'BTN', villPos: 'BB', pot: 30, call: 10 };
  const sameCard = (a, b) => !!a && !!b && a.rank === b.rank && a.suit === b.suit;
  function isDemoHand(){
    return sameCard(hole[0], DEMO.hole[0]) && sameCard(hole[1], DEMO.hole[1]) &&
      DEMO.board.every((c, i) => sameCard(board[i], c)) && !board[3] && !board[4] && !seqHasActions() &&
      document.getElementById('heroPosInput').value === DEMO.heroPos && document.getElementById('villPosInput').value === DEMO.villPos &&
      Number(document.getElementById('potInput').value) === DEMO.pot && Number(document.getElementById('callInput').value) === DEMO.call;
  }
  function loadDemo(){
    document.getElementById('resetBtn').click();
    hole = DEMO.hole.map(c => ({ ...c })); board = [...DEMO.board.map(c => ({ ...c })), null, null];
    document.getElementById('heroPosInput').value = DEMO.heroPos; document.getElementById('villPosInput').value = DEMO.villPos;
    document.getElementById('potInput').value = DEMO.pot; document.getElementById('callInput').value = DEMO.call;
    updateOrderHint(); render();
    const btn = document.getElementById('analyzeBtn');
    btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
    btn.classList.add('pulse'); setTimeout(() => btn.classList.remove('pulse'), 2400);
  }
  // Panel del ejemplo (solo en modo Fácil): la decisión se calcula de verdad la primera vez que lo abres.
  document.getElementById('demoHole').innerHTML = DEMO.hole.map(c => cardHTML(c)).join('');
  document.getElementById('demoBoard').innerHTML = DEMO.board.map(c => cardHTML(c)).join('');
  let demoDone = false;
  document.getElementById('demoPanel').addEventListener('toggle', (e) => {
    if (!e.target.open || demoDone) return;
    demoDone = true;
    setTimeout(() => {
      const r = recommend({ heroCards: DEMO.hole, boardCards: DEMO.board, pot: DEMO.pot, toCall: DEMO.call, rivals: 1,
        pool: poolFromSet(topRange(40)), oop: false, street: 1, heroPos: DEMO.heroPos, iters: 2000 });
      const cls = { RAISE: 'ok', BET: 'ok', CALL: 'warn', CHECK: 'warn', FOLD: 'no' }[r.text];
      document.getElementById('demoDec').innerHTML = `<span class="decision-badge ${cls}">${decisionHTML(r.text)}</span>` +
        `Tienes proyecto de color al as: ganas ~<b>${Math.round(r.eq)}%</b> de las veces y solo necesitas <b>${Math.round(r.needed)}%</b>.`;
    }, 50);
  });
  // Navegadores de dentro de Instagram, TikTok, Facebook…: la sesión se pierde fácil (tienen su propia memoria)
  // y el pago a veces falla. Avisamos una vez y ofrecemos abrir RÍO en el navegador de verdad.
  (function avisoNavegadorApp(){
    const ua = navigator.userAgent || '';
    const app = /Instagram/i.test(ua) ? 'Instagram' : /TikTok|musical_ly|Bytedance/i.test(ua) ? 'TikTok'
      : /FBAN|FBAV|FB_IAB/i.test(ua) ? 'Facebook' : /Twitter/i.test(ua) ? 'X' : /\bLine\//i.test(ua) ? 'Line' : '';
    if (!app || storageGet('rio_inapp_ok', false)) return;
    const bar = document.getElementById('inappBar'), android = /Android/i.test(ua);
    document.getElementById('inappTxt').innerHTML = `Estás en el navegador de <b>${app}</b>. Para no perder tu sesión, abre RÍO en ${android ? 'Chrome' : 'Safari'}` +
      (android ? '.' : ': toca <b>···</b> arriba y elige <b>«Abrir en el navegador»</b>.');
    if (android){ const a = document.getElementById('inappOpen'); a.hidden = false;
      a.href = 'intent://' + location.host + location.pathname + location.search + '#Intent;scheme=https;package=com.android.chrome;end'; }
    document.getElementById('inappCopy').addEventListener('click', (e) => {
      const b = e.currentTarget, url = location.origin + location.pathname;
      const ok = () => { b.textContent = '✅ Copiado'; };
      try { navigator.clipboard.writeText(url).then(ok, () => { b.textContent = url; }); } catch(err){ b.textContent = url; }
    });
    document.getElementById('inappClose').addEventListener('click', () => { bar.hidden = true; storageSet('rio_inapp_ok', true); });
    bar.hidden = false;
  })();
  // En ordenador el ejemplo ocupa la columna derecha: se enseña abierto desde el principio.
  if (window.matchMedia && window.matchMedia('(min-width: 1100px)').matches) document.getElementById('demoPanel').open = true;
  // "Ver el análisis completo": carga la mano de ejemplo y la analiza (no gasta análisis gratis).
  document.getElementById('demoLoadBtn').addEventListener('click', () => { loadDemo(); setTimeout(() => document.getElementById('analyzeBtn').click(), 300); });
  const backToStart = () => { document.getElementById('resetBtn').click(); document.querySelector('.entry-q').scrollIntoView({ behavior: 'smooth', block: 'start' }); };
  document.getElementById('demoOwnBtn').addEventListener('click', backToStart);
  document.getElementById('againBtn').addEventListener('click', backToStart);

  // ---- ¿Qué pasa si tu rival juega distinto? Misma mano contra 5 perfiles, de más tight a más suelto ----
  const WHATIF = [['Muy tight', 12], ['Tight', 22], ['Normal', 40], ['Suelto', 60], ['Muy suelto', 100]];
  let whatIfRun = 0;
  async function renderWhatIf(c){
    const box = document.getElementById('whatIf'), row = document.getElementById('whatIfRow'), note = document.getElementById('whatIfNote');
    const run = ++whatIfRun;
    // Abrir o tirar preflop depende de tu posición, no del rival: no hay escenarios que comparar.
    if (c.isOpen){ box.style.display = 'none'; return; }
    box.style.display = 'block';
    const cls = { RAISE: 'ok', BET: 'ok', CALL: 'warn', CHECK: 'warn', FOLD: 'no' };
    const cur = villRange.custom ? -1 : WHATIF.reduce((bi, w, i) => Math.abs(w[1] - villRange.pct) < Math.abs(WHATIF[bi][1] - villRange.pct) ? i : bi, 0);
    row.innerHTML = WHATIF.map(([n, pct], i) => `<div class="wi-cell${i === cur ? ' cur' : ''}">${n}<br><small>~${pct}%</small><b>…</b></div>`).join('');
    note.textContent = '';
    const results = [];
    for (let i = 0; i < WHATIF.length; i++){
      await new Promise(r => setTimeout(r, 0));
      if (run !== whatIfRun) return; // hay un análisis más nuevo
      const saved = villRange;
      villRange = { set: topRange(WHATIF[i][1]), pct: WHATIF[i][1], custom: false };
      const pool = villainPoolAt(c.dp || undefined);
      villRange = saved;
      const r = recommend({ heroCards: hole, boardCards: c.aBoard, pot: c.pot, toCall: c.call, rivals: numRivals, pool, oop: c.oop,
        street: c.aStreet, heroPos: c.heroPos, unraised: c.unraised, premium: c.premium, iters: 1200 });
      results.push(r.text);
      const cell = row.children[i].querySelector('b');
      cell.className = cls[r.text]; cell.innerHTML = decisionHTML(r.text);
    }
    const same = results.every(x => x === results[0]);
    note.innerHTML = same
      ? 'Aquí da igual cómo juegue: la decisión es la misma contra cualquier tipo de rival.'
      : 'La decisión cambia según tu rival: contra jugadores <b>tight</b>, sus apuestas suelen ser manos fuertes y conviene ser más prudente; contra jugadores <b>sueltos</b>, tu mano gana más a menudo.' +
        (cur === -1 ? '' : ' El recuadro rojo es el rival que has elegido.');
  }

  const reraiseToggleBtn = document.getElementById('reraiseToggleBtn');
  const reraisePanel = document.getElementById('reraisePanel');
  reraiseToggleBtn.addEventListener('click', () => {
    const open = reraisePanel.style.display !== 'none';
    reraisePanel.style.display = open ? 'none' : 'block';
    reraiseToggleBtn.textContent = open
      ? 'Analizar nueva apuesta →'
      : 'Ocultar ↑';
  });

  document.getElementById('reraiseAnalyzeBtn').addEventListener('click', () => {
    const rrResult = document.getElementById('reraiseResult');
    if (lastWin === null){ rrResult.innerHTML = 'Analiza una mano primero.'; return; }
    const pot = Math.max(0, Number(document.getElementById('reraisePotInput').value) || 0);
    const call = Math.max(0, Number(document.getElementById('reraiseCallInput').value) || 0);
    if (call <= 0){ rrResult.innerHTML = 'Pon cuánto te cuesta igualar la subida.'; return; }

    const needed = (pot > 0) ? (call/(pot+call))*100 : 100;
    // Una segunda subida suele venir con un rango más fuerte del rival, así que exigimos más margen
    // que en la decisión inicial de la misma posición.
    // Usamos tu equity contra el rango con el que suele resubir (más fuerte).
    const eq = lastE2 !== null ? lastE2 : lastWin;
    const raiseBuffer = lastOop ? 10 : 6;
    const callBuffer = lastOop ? 2 : 0;

    let text, cls;
    if (eq >= needed + raiseBuffer){ text = 'RAISE'; cls = 'ok'; }
    else if (eq >= needed + callBuffer){ text = 'CALL'; cls = 'warn'; }
    else { text = 'FOLD'; cls = 'no'; }

    const posPhrase = lastOop
      ? 'Sigues fuera de posición, y encima tu rival ha subido dos veces: su rango real suele ser más fuerte de lo normal.'
      : 'Tienes posición, lo que ayuda, pero una segunda subida suele indicar una mano más fuerte de lo habitual.';
    const edge = (eq - needed).toFixed(1).replace('.', ',');
    let text2;
    if (text === 'RAISE'){
      text2 = `Con <b>${eq.toFixed(1).replace('.', ',')}%</b> de equity contra su rango de resubida sigues muy por encima del <b>${needed.toFixed(1).replace('.', ',')}%</b> que necesitas, incluso exigiendo un margen extra por la segunda subida. ${posPhrase}`;
    } else if (text === 'CALL'){
      text2 = `Tu equity contra su rango de resubida (<b>${eq.toFixed(1).replace('.', ',')}%</b>) sigue por encima del <b>${needed.toFixed(1).replace('.', ',')}%</b> necesario (diferencia de ${edge}%), aunque justo. ${posPhrase} Iguala, pero no metas más fichas sin mejorar la mano.`;
    } else {
      text2 = `Necesitarías <b>${needed.toFixed(1).replace('.', ',')}%</b> de equity y contra su rango de resubida solo tienes <b>${eq.toFixed(1).replace('.', ',')}%</b>, con el añadido de que la segunda subida suele significar una mano fuerte del rival. ${posPhrase} Lo más sólido aquí es retirarse.`;
    }

    const easy2 = text === 'RAISE'
      ? 'Sigues muy por delante incluso después de la segunda subida: vuelve a subir.'
      : text === 'CALL'
        ? 'Está justo, pero todavía compensa pagar. No metas más fichas sin mejorar tu mano.'
        : 'Que te suban dos veces suele significar una mano muy fuerte. Aquí lo mejor es tirar.';
    rrResult.innerHTML = `<span class="rr-badge ${cls}">${decisionHTML(text)}</span><br><span class="easy-only">${easy2}</span><span class="pro-only">${text2}</span>`;
  });

  document.getElementById('nextStreetBtn').addEventListener('click', () => {
    // Sin secuencia: si has pagado, lo pagado pasa al bote y la nueva calle empieza sin apuesta.
    if (!seqHasActions()){
      const pot = Number(document.getElementById('potInput').value) || 0;
      const call = Number(document.getElementById('callInput').value) || 0;
      document.getElementById('potInput').value = Math.round((pot + call * 2) * 100) / 100;
      document.getElementById('callInput').value = 0;
    }
    const next = Math.min(3, analysisStreet() + 1);
    document.querySelector('#holeRow').scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => selectStreet(next), 350);
  });

  let lastSummary = '';
  document.getElementById('copyBtn').addEventListener('click', async () => {
    const btn = document.getElementById('copyBtn');
    if (!lastSummary){ return; }
    try {
      await navigator.clipboard.writeText(lastSummary);
      const original = btn.textContent;
      btn.textContent = '✓ Copiado';
      setTimeout(() => { btn.textContent = original; }, 1600);
    } catch(e){
      alert(lastSummary);
    }
  });

  document.getElementById('resetBtn').addEventListener('click', () => {
    posTouched = false;
    hole = [null,null]; board = [null,null,null,null,null];
    numRivals = 1; rivVal.textContent = '1';
    document.getElementById('potInput').value = '';
    document.getElementById('callInput').value = '';
    document.getElementById('stackInput').value = '';
    document.getElementById('villStackInput').value = '';
    document.getElementById('heroPosInput').value = 'BTN';
    document.getElementById('villPosInput').value = 'BB';
    lastWin = null; lastTie = null; lastOop = false; lastE2 = null;
    seq = [[], [], [], []]; seqStreet = 0; seqActor = null; seqPending = null; selStreet = null;
    document.getElementById('planBox').innerHTML = '';
    document.getElementById('reraisePanel').style.display = 'none';
    document.getElementById('reraiseResult').innerHTML = '';
    document.getElementById('reraisePotInput').value = '';
    document.getElementById('reraiseCallInput').value = '';
    reraiseToggleBtn.textContent = 'Analizar nueva apuesta →';
    document.getElementById('screenshotStatus').style.display = 'none';
    updateOrderHint();
    render();
  });

  (function restoreDefaults(){
    if (!storageGet('rio_remember_defaults', true)) return;
    const d = storageGet('rio_defaults', null);
    if (!d) return;
    if (d.heroPos) document.getElementById('heroPosInput').value = d.heroPos;
    if (d.villPos) document.getElementById('villPosInput').value = d.villPos;
    if (d.numRivals){ numRivals = Math.max(1, Math.min(9, d.numRivals)); rivVal.textContent = numRivals; }
    updateOrderHint();
  })();

  // Lo que usa la partida de práctica (partida.js) del motor de RÍO
  window.RIO_ENGINE = { recommend, runEquity, withBluffs, poolFromSet, topRange, handTopPercent, bestHand, categoryName,
    fullDeck, drawN, grade, OPEN_PCT, cardHTML, decisionHTML, of20, storageGet, storageSet,
    cardText: (c) => RANK_LABEL(c.rank) + SUIT_SYMBOL[c.suit] };

  render();
  loadSharedHand();
  // Si RÍO ya estaba abierto y se abre otro enlace compartido en la misma pestaña.
  window.addEventListener('hashchange', loadSharedHand);
})();
