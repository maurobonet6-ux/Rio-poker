// Partida de práctica de RÍO: una mesa de 6 jugadores a pantalla completa.
// Tú contra 5 rivales con su propia forma de jugar, con fichas de práctica sin ningún valor.
// Al acabar cada mano, RÍO repasa tus decisiones con la misma lógica que el analizador.
// Usa el motor de app.js (window.RIO_ENGINE): equity, recomendación, rangos y evaluador de manos.
(function(){
  const E = window.RIO_ENGINE;
  if (!E) return;
  const $ = (id) => document.getElementById(id);
  const view = $('gameView');
  if (!view) return;

  const SB = 1, BB = 2, START = 200;
  // Posiciones según la distancia al botón, para cada tamaño de mesa (2 a 6 jugadores)
  const POS_N = { 2: ['BTN', 'BB'], 3: ['BTN', 'SB', 'BB'], 4: ['BTN', 'SB', 'BB', 'CO'], 5: ['BTN', 'SB', 'BB', 'HJ', 'CO'], 6: ['BTN', 'SB', 'BB', 'UTG', 'HJ', 'CO'] };
  // Dónde se sienta cada uno en la mesa (b = abajo, tú; luego en el sentido de las agujas del reloj)
  const SLOTS = { 2: ['b', 't'], 3: ['b', 'tl', 'tr'], 4: ['b', 'l', 't', 'r'], 5: ['b', 'bl', 'tl', 'tr', 'br'], 6: ['b', 'bl', 'tl', 't', 'tr', 'br'] };
  const HU_OPEN = 80;   // mano a mano, el botón abre muchas más manos que en una mesa de 6
  const POS_ES = { BTN: 'Botón', SB: 'Ciega pequeña', BB: 'Ciega grande', UTG: 'Primero', HJ: 'Hijack', CO: 'Cutoff' };
  const STREETS = ['Preflop', 'Flop', 'Turn', 'River'];
  // Rivales ficticios, cada uno con su estilo: cuánto juega, cuánto paga, cuánto farolea y cuánto sube.
  const RIVALES = [
    { name: 'Lucía', av: '🦊', estilo: 'Sólida',    open: 0.85, call: 0.85, bluff: 0.06, aggr: 1.0 },
    { name: 'Tony',  av: '🐻', estilo: 'Suelto',    open: 1.35, call: 1.5,  bluff: 0.10, aggr: 0.7 },
    { name: 'Marta', av: '🦉', estilo: 'Paciente',  open: 0.7,  call: 0.9,  bluff: 0.04, aggr: 0.9 },
    { name: 'Kike',  av: '🐯', estilo: 'Agresivo',  open: 1.25, call: 1.0,  bluff: 0.24, aggr: 1.5 },
    { name: 'Sara',  av: '🐺', estilo: 'Equilibrada', open: 1.0, call: 1.0, bluff: 0.12, aggr: 1.1 },
    { name: 'Pablo', av: '🦁', estilo: 'Valiente',  open: 1.15, call: 1.2,  bluff: 0.16, aggr: 1.2 },
    { name: 'Nuria', av: '🐼', estilo: 'Tranquila', open: 0.9,  call: 1.1,  bluff: 0.05, aggr: 0.8 },
    { name: 'Dani',  av: '🦈', estilo: 'Tiburón',   open: 1.1,  call: 0.95, bluff: 0.18, aggr: 1.35 },
    { name: 'Elena', av: '🐙', estilo: 'Imprevisible', open: 1.2, call: 1.2, bluff: 0.2, aggr: 1.2 }
  ];
  // Cuántos jugadores: '2'…'6' o 'var' (varía: de vez en cuando alguien se levanta o se sienta)
  const modo = () => { const m = String(E.storageGet('rio_pp_jugadores', '6')); return /^[2-6]$|^var$/.test(m) ? m : '6'; };
  const rnd = () => Math.random();
  const esc = (x) => String(x).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const fmt = (n) => (Math.round(n * 10) / 10).toLocaleString('es-ES');
  const velocidad = () => (E.storageGet('rio_pp_speed', 'normal') === 'rapida' ? 90 : 750);

  // ---------- Sesión (se guarda: fichas de cada uno, botón y estadísticas) ----------
  let S = null;
  const hueco = () => RIVALES.filter(r => !S.seats.some(s => s.name === r.name));
  function nuevaSesion(){
    const m = modo(), n = m === 'var' ? 3 + Math.floor(rnd() * 4) : Number(m);
    const rivales = [...RIVALES].sort(() => rnd() - 0.5).slice(0, n - 1);
    S = { seats: [{ name: 'Tú', av: '🙂', hero: true, stack: START }].concat(rivales.map(r => ({ ...r, stack: START }))),
      button: Math.floor(rnd() * n), mano: 0, recargas: 0, total: START * n };
    guardaSesion();
  }
  function guardaSesion(){ E.storageSet('rio_pp_sesion', { seats: S.seats.map(s => ({ name: s.name, stack: s.stack })), button: S.button, mano: S.mano, recargas: S.recargas }); }
  function cargaSesion(){
    const g = E.storageGet('rio_pp_sesion', null);
    nuevaSesion();
    const seats = g && Array.isArray(g.seats) ? g.seats : null;
    if (seats && seats.length >= 2 && seats.length <= 6 && seats[0].name === 'Tú' && seats.slice(1).every(x => RIVALES.some(r => r.name === x.name))){
      S.seats = seats.map((x, i) => i === 0 ? { name: 'Tú', av: '🙂', hero: true, stack: Number(x.stack) || START } : { ...RIVALES.find(r => r.name === x.name), stack: Number(x.stack) || START });
      S.button = (g.button || 0) % S.seats.length; S.mano = g.mano || 0; S.recargas = g.recargas || 0;
      S.total = S.seats.reduce((t, s) => t + s.stack, 0);
    }
  }
  // Antes de cada mano: la mesa se ajusta al número de jugadores elegido (o cambia sola en «Variable»)
  function ajustaMesa(){
    const m = modo(), avisos = [];
    let objetivo = S.seats.length;
    if (m !== 'var') objetivo = Number(m);
    else if (S.mano > 0 && rnd() < 0.22) objetivo = Math.min(6, Math.max(3, objetivo + (rnd() < 0.5 ? -1 : 1)));
    else objetivo = Math.min(6, Math.max(3, objetivo));
    while (S.seats.length > objetivo){
      const i = 1 + Math.floor(rnd() * (S.seats.length - 1)), fuera = S.seats[i];
      S.seats.splice(i, 1); S.total -= fuera.stack;
      if (i <= S.button) S.button = (S.button - 1 + S.seats.length) % S.seats.length;
      avisos.push(`${fuera.name} se levanta de la mesa`);
    }
    while (S.seats.length < objetivo){
      const libres = hueco(), nuevo = libres[Math.floor(rnd() * libres.length)];
      S.seats.push({ ...nuevo, stack: START }); S.total += START;
      avisos.push(`${nuevo.name} se sienta en la mesa`);
    }
    S.button %= S.seats.length;
    return avisos;
  }
  const stats = () => E.storageGet('rio_partidas', { manos: 0, dec: 0, ok: 0, fichas: 0, ganadas: 0, mejor: null });

  // ---------- Motor de la mano ----------
  let H = null;
  const nJ = () => H.p.length;
  const posDe = (i) => POS_N[nJ()][(i - H.button + nJ()) % nJ()];
  const openPct = (pos) => (nJ() === 2 && pos === 'BTN' ? HU_OPEN : E.OPEN_PCT[pos] || 30);
  const vivos = () => H.p.filter(p => !p.folded);
  const puedenHablar = () => H.p.filter(p => !p.folded && !p.allin);
  const siguiente = (i, cond) => { const n = nJ(); for (let k = 1; k <= n; k++){ const j = (i + k) % n; if (cond(H.p[j])) return j; } return -1; };
  const bote = () => H.p.reduce((t, p) => t + p.total, 0);
  const tablero = () => H.board5.slice(0, [0, 3, 4, 5][H.street]);
  const apuestaMax = () => Math.max(...H.p.map(p => p.inn));

  function nuevaMano(){
    // Quien se queda sin fichas recarga (los rivales siempre; tú también, y te lo decimos)
    let aviso = '';
    const cambios = ajustaMesa();
    S.seats.forEach(s => { if (s.stack < BB * 2){ const extra = START - s.stack; s.stack = START; S.recargas++; S.total += extra; if (s.hero) aviso = 'Te has quedado sin fichas: te recargamos 200 para seguir practicando.'; } });
    S.mano++;
    const N = S.seats.length;
    S.button = (S.button + 1) % N;
    const deck = E.drawN(E.fullDeck(), N * 2 + 5);
    H = { button: S.button, street: 0, board5: deck.slice(N * 2), raises: 0, lastRaise: BB, log: [], dec: [], over: false, res: null,
      nuevo: { cartas: true, calle: false }, pista: null, lastAggr: null, aggrPool: null, rangos: {},
      p: S.seats.map((s, i) => ({ i, name: s.name, av: s.av, hero: !!s.hero, style: s, stack: s.stack, cards: [deck[i * 2], deck[i * 2 + 1]],
        inn: 0, total: 0, folded: false, allin: false, acted: false, bubble: '' })) };
    H.p.forEach(p => { H.rangos[p.i] = E.poolFromSet(E.topRange(100)); });
    cambios.forEach(t => H.log.push({ t, k: 'info' }));
    if (aviso) H.log.push({ t: aviso, k: 'info' });
    H.log.push({ t: `Mano ${S.mano} · ${N} jugadores · el botón es ${H.p[H.button].name}`, k: 'calle' });
    // Mano a mano, el botón pone la ciega pequeña (y habla primero antes del flop)
    const sb = N === 2 ? H.button : siguiente(H.button, () => true), bb = siguiente(sb, () => true);
    paga(H.p[sb], SB); H.p[sb].bubble = `Ciega ${SB}`;
    paga(H.p[bb], BB); H.p[bb].bubble = `Ciega ${BB}`;
    H.turn = siguiente(bb, p => !p.folded && !p.allin);
  }
  function paga(p, n){ const x = Math.min(n, p.stack); p.stack -= x; p.inn += x; p.total += x; if (p.stack === 0) p.allin = true; return x; }

  // Opciones de quien habla: tirar / pasar / pagar / subir hasta (mín.–máx.)
  function opciones(p){
    const toCall = apuestaMax() - p.inn;
    const maxTo = p.inn + p.stack;
    const otrosConFichas = H.p.some(q => q !== p && !q.folded && !q.allin);
    const minTo = Math.min(maxTo, apuestaMax() + Math.max(H.lastRaise, BB));
    return { toCall: Math.min(toCall, p.stack), puedePasar: toCall <= 0, puedeSubir: otrosConFichas && maxTo > apuestaMax() && H.raises < 5, minTo, maxTo };
  }
  // Aplica una acción: { a: 'FOLD'|'CHECK'|'CALL'|'RAISE', to }
  function aplica(i, op){
    const p = H.p[i], max = apuestaMax(), toCall = max - p.inn;
    let txt;
    if (op.a === 'FOLD'){ p.folded = true; txt = 'Tira'; }
    else if (op.a === 'CHECK'){ txt = 'Pasa'; }
    else if (op.a === 'CALL'){ const x = paga(p, toCall); txt = p.allin ? `Paga ${fmt(x)} (todo)` : `Paga ${fmt(x)}`; }
    else {
      const to = Math.min(Math.max(op.to, Math.min(p.inn + p.stack, max + H.lastRaise)), p.inn + p.stack);
      const subida = to - max;
      paga(p, to - p.inn);
      if (subida >= H.lastRaise) H.lastRaise = subida;
      H.raises++;
      H.p.forEach(q => { if (q !== p) q.acted = false; });
      H.lastAggr = i;
      // Lo que se deduce del rango de quien sube
      const pos = posDe(i);
      H.rangos[i] = H.street === 0 ? E.poolFromSet(E.topRange(H.raises >= 2 ? (nJ() === 2 ? 18 : 9) : nJ() === 2 ? openPct(pos) : Math.min(45, openPct(pos))))
        : E.withBluffs(H.rangos[i], tablero(), 0.55, 0.12, p.cards);
      txt = (toCall > 0 || H.street === 0 ? `Sube a ${fmt(p.inn)}` : `Apuesta ${fmt(p.inn)}`) + (p.allin ? ' (todo)' : '');
    }
    if (op.a === 'CALL' && H.street === 0) H.rangos[i] = E.poolFromSet(E.topRange(H.raises >= 2 ? 14 : 45));
    p.acted = true;
    p.bubble = txt;
    H.log.push({ t: `${p.hero ? 'Tú' : p.name}: ${txt.toLowerCase()}`, k: p.hero ? 'yo' : '' });
    avanza(i);
  }
  function avanza(i){
    const vivosAhora = vivos();
    if (vivosAhora.length === 1) return reparte(vivosAhora[0]);
    const max = apuestaMax(), hablan = puedenHablar();
    const cerrada = hablan.every(p => p.acted && p.inn === max) || (hablan.length <= 1 && (hablan.length === 0 || hablan[0].inn >= max));
    if (!cerrada){ H.turn = siguiente(i, q => !q.folded && !q.allin && (!q.acted || q.inn < max)); return; }
    // Se cierra la calle: las apuestas pasan al bote
    H.p.forEach(p => { p.inn = 0; p.acted = false; });
    H.raises = 0; H.lastRaise = BB;
    if (H.street === 3 || puedenHablar().length <= 1){
      if (H.street < 3) H.log.push({ t: 'Todos con todo: se reparten las cartas que faltan', k: 'info' });
      H.street = 3; return enseña();
    }
    H.street++;
    H.nuevo.calle = true;
    H.p.forEach(p => { if (!p.folded) p.bubble = ''; });
    H.log.push({ t: `${STREETS[H.street]}: ${tablero().map(c => E.cardText(c)).join(' ')}`, k: 'calle' });
    H.turn = siguiente(H.button, q => !q.folded && !q.allin);
  }
  // Fin por abandono: el que queda se lleva todo
  function reparte(g){
    const total = bote();
    g.stack += total;
    H.res = { ganadores: [{ i: g.i, gana: total }], showdown: false };
    cierra();
  }
  // Enseñanza: botes (y botes secundarios si alguien fue con todo)
  function enseña(){
    const vivosAhora = vivos();
    vivosAhora.forEach(p => { p.mano = E.bestHand([...p.cards, ...H.board5]); p.bubble = E.categoryName(p.mano.category, p.mano.tiebreak); });
    const niveles = [...new Set(H.p.map(p => p.total).filter(t => t > 0))].sort((a, b) => a - b);
    const gana = {};
    let prev = 0;
    for (const lvl of niveles){
      const trozo = H.p.reduce((t, p) => t + Math.max(0, Math.min(p.total, lvl) - prev), 0);
      const aspirantes = vivosAhora.filter(p => p.total >= lvl);
      prev = lvl;
      if (!trozo) continue;
      if (!aspirantes.length){ // nadie vivo llegó a este nivel: se devuelve a quien lo puso
        H.p.filter(p => p.total >= lvl).forEach(p => { gana[p.i] = (gana[p.i] || 0) + trozo / H.p.filter(q => q.total >= lvl).length; });
        continue;
      }
      const mejor = Math.max(...aspirantes.map(p => p.mano.score));
      const ws = aspirantes.filter(p => p.mano.score === mejor);
      ws.forEach(p => { gana[p.i] = (gana[p.i] || 0) + trozo / ws.length; });
    }
    Object.entries(gana).forEach(([i, n]) => { H.p[i].stack += n; });
    H.res = { ganadores: Object.entries(gana).map(([i, n]) => ({ i: Number(i), gana: n })).sort((a, b) => b.gana - a.gana), showdown: true };
    cierra();
  }
  function cierra(){
    H.over = true; H.turn = -1;
    H.p.forEach(p => { p.inn = 0; });
    const hero = H.p[0], cambio = hero.stack - S.seats[0].stack;
    H.res.cambio = cambio;
    H.res.ganadores.forEach(w => { const p = H.p[w.i]; H.log.push({ t: `${p.hero ? 'Ganas' : p.name + ' gana'} ${fmt(w.gana)} fichas${p.mano && H.res.showdown ? ' con ' + E.categoryName(p.mano.category, p.mano.tiebreak).toLowerCase() : ''}`, k: 'gana' }); });
    H.p.forEach(p => { S.seats[p.i].stack = p.stack; });
    guardaSesion();
    const st = stats();
    st.manos++; st.dec += H.dec.length; st.ok += H.dec.filter(d => d.g === 'ok').length; st.fichas += cambio;
    if (cambio > 0) st.ganadas = (st.ganadas || 0) + 1;
    if (H.res.showdown && hero.mano && H.res.ganadores.some(w => w.i === 0) && (!st.mejor || hero.mano.score > st.mejor.score))
      st.mejor = { score: hero.mano.score, txt: E.categoryName(hero.mano.category, hero.mano.tiebreak) };
    E.storageSet('rio_partidas', st);
    if (window.RIO_TRACK) window.RIO_TRACK('practice_completed', { n: H.dec.length, ok: H.dec.filter(d => d.g === 'ok').length });
  }

  // ---------- Lo que haría RÍO en tu lugar ----------
  function recomendacion(){
    const hero = H.p[0], o = opciones(hero);
    const rivales = vivos().length - 1;
    let pool = H.lastAggr !== null && H.lastAggr !== 0 ? H.rangos[H.lastAggr] : E.poolFromSet(E.topRange(H.street === 0 ? 100 : 60));
    if (o.toCall > 0 && H.street > 0 && H.lastAggr !== null && H.lastAggr !== 0) pool = E.withBluffs(pool, tablero(), 0.55, 0.1, hero.cards);
    const orden = (j) => (j - H.button - 1 + nJ()) % nJ();      // quién habla antes después del flop
    const oop = H.street > 0 && vivos().some(p => !p.hero && orden(p.i) > orden(0));
    // Mano a mano, abrir desde el botón se juzga con el rango de mano a mano (mucho más amplio)
    if (nJ() === 2 && H.street === 0 && H.raises === 0 && posDe(0) === 'BTN'){
      const top = E.handTopPercent(hero.cards[0], hero.cards[1]);
      return { text: top <= HU_OPEN ? 'RAISE' : 'FOLD', kind: 'open', top, eq: 0, needed: 0 };
    }
    return E.recommend({ heroCards: hero.cards, boardCards: tablero(), pot: bote(), toCall: o.toCall, rivals: Math.max(1, rivales), pool,
      oop, street: H.street, heroPos: posDe(0), unraised: H.street === 0 && H.raises === 0, iters: 700 });
  }
  function porque(r, toCall){
    if (r.kind === 'open') return `Tu mano está en el top ${Math.max(1, Math.round(r.top))}% y desde ${POS_ES[posDe(0)].toLowerCase()} se suele abrir más o menos el ${openPct(posDe(0))}%${nJ() === 2 ? ' (mano a mano)' : ''}.`;
    if (toCall > 0) return `Ganabas unas ${E.of20(r.eq)} de cada 20 y para pagar necesitabas ${E.of20(r.needed)}.`;
    return `Ganabas unas ${E.of20(r.eq)} de cada 20 contra lo que suelen tener tus rivales.`;
  }

  // ---------- Los rivales ----------
  function decideRival(i){
    const p = H.p[i], st = p.style, o = opciones(p), max = apuestaMax(), pos = posDe(i);
    const subir = (to) => (o.puedeSubir ? { a: 'RAISE', to: Math.max(o.minTo, Math.min(o.maxTo, Math.round(to))) } : null);
    const pagarOTirar = (ok) => (o.puedePasar ? { a: 'CHECK' } : ok ? { a: 'CALL' } : { a: 'FOLD' });
    const caro = o.toCall > p.stack * 0.45;
    if (H.street === 0){
      const top = E.handTopPercent(p.cards[0], p.cards[1]);
      const abrir = openPct(pos) * st.open;
      if (H.raises === 0){
        if (o.puedePasar) return top <= 14 * st.aggr ? subir(BB * 4) || { a: 'CHECK' } : { a: 'CHECK' };      // ciega grande con cojeadores
        if (top <= abrir || rnd() < st.bluff * 0.3) return subir(BB * 3 + H.p.filter(q => q.inn === BB && !q.folded && q.i !== i && posDe(q.i) !== 'BB').length * BB) || pagarOTirar(true);
        return pos === 'SB' && top <= 60 * st.call && rnd() < 0.3 ? { a: 'CALL' } : { a: 'FOLD' };
      }
      if (H.raises === 1){
        if (top <= 5 * st.aggr || (rnd() < st.bluff * 0.25 && top <= 40)) return subir(max * 3.2) || pagarOTirar(true);
        const limite = (pos === 'BB' ? (nJ() === 2 ? 62 : 38) : pos === 'BTN' || pos === 'CO' ? 20 : 14) * st.call;
        return pagarOTirar(top <= (caro ? limite / 2.5 : limite));
      }
      if (top <= 2.5) return subir(o.maxTo) || pagarOTirar(true);
      return pagarOTirar(top <= (caro ? 4 : 8) * st.call);
    }
    // Después del flop: su equity contra lo que creen que tenéis los demás
    const rivales = vivos().length - 1;
    const pool = H.lastAggr !== null && H.lastAggr !== i ? H.rangos[H.lastAggr] : E.poolFromSet(E.topRange(50));
    const r = E.runEquity(p.cards, tablero(), rivales, 320, pool), e = r.win + r.tie / 2;
    const b = bote();
    if (o.puedePasar){
      if (!o.puedeSubir) return { a: 'CHECK' };
      if (e > 68) return subir(b * (rnd() < 0.5 ? 0.66 : 1));
      if (e > 52 && rnd() < 0.55 * st.aggr) return subir(b * 0.5);
      if (rivales <= 2 && rnd() < st.bluff) return subir(b * 0.5);
      return { a: 'CHECK' };
    }
    const needed = o.toCall / (b + o.toCall) * 100;
    if (e > 80 && rnd() < 0.45 * st.aggr) return subir(max * 3) || { a: 'CALL' };
    if (e >= needed - 4 * st.call) return { a: 'CALL' };
    if (rivales === 1 && rnd() < st.bluff * 0.25) return subir(max * 2.6) || { a: 'FOLD' };
    return { a: 'FOLD' };
  }

  // ---------- Pintar la mesa ----------
  let timer = null, anim = { cartas: false, calle: false };
  function carta(c, cls){ return c ? E.cardHTML(c, true).replace('mini-card big', 'mini-card big g-card ' + (cls || '')) : `<span class="mini-card big g-card g-back ${cls || ''}"></span>`; }
  function pinta(){
    if (!H) return;
    anim = { cartas: H.nuevo.cartas, calle: H.nuevo.calle }; H.nuevo = { cartas: false, calle: false };
    const st = stats(), pct = st.dec ? Math.round(st.ok / st.dec * 100) : null;
    $('gStats').innerHTML = `<span>Mano <b>${S.mano}</b></span><span>Aciertos <b>${pct === null ? '—' : pct + '%'}</b></span><span>Fichas <b class="${st.fichas >= 0 ? 'pos' : 'neg'}">${st.fichas >= 0 ? '+' : ''}${fmt(st.fichas)}</b></span>`;
    const ganan = H.over ? new Set(H.res.ganadores.map(w => w.i)) : new Set();
    $('gSeats').innerHTML = H.p.map(p => {
      const enseña = p.hero || (H.over && H.res.showdown && !p.folded);
      const pos = posDe(p.i);
      const g = H.over ? H.res.ganadores.find(w => w.i === p.i) : null;
      return `<div class="g-seat sl-${SLOTS[nJ()][p.i]}${p.folded ? ' fold' : ''}${H.turn === p.i ? ' turn' : ''}${ganan.has(p.i) ? ' win' : ''}${p.hero ? ' hero' : ''}">
        <div class="g-cards">${p.cards.map((c, k) => carta(enseña ? c : null, anim.cartas ? `deal d${(p.i * 2 + k) % 12}` : '')).join('')}</div>
        <div class="g-plate">
          <div class="g-av">${p.av}${p.i === H.button ? '<span class="g-dealer">D</span>' : ''}</div>
          <div class="g-info"><b>${esc(p.name)}</b><span>${p.allin && !H.over ? 'Todo' : fmt(p.stack)}</span></div>
        </div>
        <div class="g-tag">${pos}${p.hero ? '' : ` · ${esc(p.style.estilo)}`}</div>
        ${p.bubble ? `<div class="g-bubble${/tira/i.test(p.bubble) ? ' b-fold' : /sube|apuesta/i.test(p.bubble) ? ' b-raise' : ''}">${esc(p.bubble)}</div>` : ''}
        ${g ? `<div class="g-won">+${fmt(g.gana)}</div>` : ''}
        ${p.inn > 0 ? `<div class="g-bet"><i></i>${fmt(p.inn)}</div>` : ''}
      </div>`;
    }).join('');
    const board = tablero();
    $('gBoard').innerHTML = [0, 1, 2, 3, 4].map(k => board[k] ? carta(board[k], anim.calle && k >= [0, 0, 3, 4][H.street] || (anim.calle && H.street === 1) ? `flip f${k}` : '') : '<span class="mini-card big g-card g-slot"></span>').join('');
    $('gPot').innerHTML = `<i></i>Bote <b>${fmt(bote())}</b>`;
    $('gStreet').textContent = H.over ? 'Mano terminada' : STREETS[H.street];
    pintaAcciones();
    pintaPanel();
    $('gFin').hidden = true;
  }
  function pintaAcciones(){
    const bar = $('gActions');
    if (H && H.over){
      // Resultado de la mano en la propia barra, para no tapar la mesa
      const hero = H.p[0], c = H.res.cambio;
      bar.classList.remove('wait'); bar.classList.add('fin');
      bar.innerHTML = `<div class="g-fin-row"><div>
          <div class="g-fin-t ${c > 0 ? 'pos' : c < 0 ? 'neg' : ''}">${c > 0 ? `¡Ganas ${fmt(c)} fichas!` : c < 0 ? `Pierdes ${fmt(-c)} fichas` : hero.folded ? 'Te retiraste sin perder nada' : 'Recuperas lo que pusiste'}</div>
          ${H.dec.length ? `<div class="g-fin-s">Decisiones: <b>${H.dec.filter(d => d.g === 'ok').length} de ${H.dec.length}</b> como las recomienda RÍO · <a href="#" id="gVerRepaso">ver repaso</a></div>` : '<div class="g-fin-s">No te tocó decidir en esta mano.</div>'}
        </div><button type="button" class="btn-primary" id="gNext">Siguiente mano →</button></div>`;
      $('gNext').addEventListener('click', () => { nuevaMano(); pinta(); turnoRivales(); });
      const ver = $('gVerRepaso'); if (ver) ver.addEventListener('click', (e) => { e.preventDefault(); view.dataset.tab = 'repaso'; pintaPanel(); $('gPanel').scrollIntoView({ behavior: 'smooth', block: 'nearest' }); });
      return;
    }
    bar.classList.remove('fin');
    if (!H || H.turn !== 0){
      bar.classList.add('wait');
      bar.innerHTML = `<div class="g-wait"><span class="g-dots"></span>${H ? esc(H.p[H.turn] ? H.p[H.turn].name : '') : ''} está pensando…</div>`;
      return;
    }
    bar.classList.remove('wait');
    const hero = H.p[0], o = opciones(hero), b = bote();
    const presets = [['½', 0.5], ['⅔', 0.66], ['Bote', 1]].map(([l, f]) => [l, Math.round(apuestaMax() + (b + o.toCall) * f)])
      .filter(([, v]) => v >= o.minTo && v < o.maxTo);
    presets.push(['Todo', o.maxTo]);
    const def = Math.min(o.maxTo, Math.max(o.minTo, H.street === 0 ? (H.raises ? apuestaMax() * 3 : BB * 3) : Math.round(apuestaMax() + (b + o.toCall) * 0.66)));
    bar.innerHTML = `
      ${H.pista ? `<div class="g-hint">💡 RÍO haría <b>${E.decisionHTML(H.pista.text)}</b>. ${porque(H.pista, o.toCall)}</div>` : ''}
      ${o.puedeSubir ? `<div class="g-raise">
        <div class="g-presets">${presets.map(([l, v]) => `<button type="button" data-to="${v}">${l}</button>`).join('')}</div>
        <input type="range" id="gAmount" min="${o.minTo}" max="${o.maxTo}" step="1" value="${def}" aria-label="Cantidad de la subida">
      </div>` : ''}
      <div class="g-btns">
        <button type="button" class="g-b fold" data-act="fold"${o.puedePasar ? ' title="Puedes pasar gratis"' : ''}>Tirar <kbd>F</kbd></button>
        ${o.puedePasar ? '<button type="button" class="g-b check" data-act="check">Pasar <kbd>C</kbd></button>'
          : `<button type="button" class="g-b call" data-act="call">Pagar ${fmt(o.toCall)}${o.toCall >= hero.stack ? ' (todo)' : ''} <kbd>C</kbd></button>`}
        ${o.puedeSubir ? `<button type="button" class="g-b raise" data-act="raise"><span id="gRaiseLbl"></span> <kbd>R</kbd></button>` : ''}
        <button type="button" class="g-b hint" data-act="hint" title="Ver qué haría RÍO">💡</button>
      </div>`;
    const amount = $('gAmount');
    const etiqueta = () => { const lbl = $('gRaiseLbl'); if (!lbl) return; const v = Number(amount.value);
      lbl.textContent = v >= o.maxTo ? `Todo (${fmt(v)})` : o.puedePasar && H.street > 0 ? `Apostar ${fmt(v)}` : `Subir a ${fmt(v)}`; };
    if (amount){ amount.addEventListener('input', etiqueta); etiqueta();
      bar.querySelectorAll('[data-to]').forEach(x => x.addEventListener('click', () => { amount.value = x.dataset.to; etiqueta(); })); }
    bar.querySelectorAll('[data-act]').forEach(x => x.addEventListener('click', () => juegaHeroe(x.dataset.act)));
  }
  function juegaHeroe(act){
    if (!H || H.over || H.turn !== 0) return;
    const o = opciones(H.p[0]);
    if (act === 'hint'){ H.pista = recomendacion(); H.usoPista = true; pintaAcciones(); return; }
    if (act === 'check' && !o.puedePasar) act = 'call';
    if (act === 'call' && o.puedePasar) act = 'check';
    if (act === 'raise' && !o.puedeSubir) return;
    const r = H.pista || recomendacion();
    const a = act === 'fold' ? 'FOLD' : act === 'check' ? 'CHECK' : act === 'call' ? 'CALL' : (o.toCall > 0 || H.street === 0 && H.raises > 0 ? 'RAISE' : 'BET');
    H.dec.push({ s: H.street, act: a, rec: r.text, g: E.grade(r.text, a), why: porque(r, o.toCall), pista: !!H.pista });
    H.pista = null;
    const to = act === 'raise' ? Number(($('gAmount') || {}).value || o.minTo) : 0;
    aplica(0, { a: a === 'BET' ? 'RAISE' : a, to });
    pinta(); turnoRivales();
  }
  function turnoRivales(){
    clearTimeout(timer);
    if (!H || H.over || H.turn === 0 || H.turn < 0) return;
    timer = setTimeout(() => {
      if (!H || H.over || H.turn === 0 || view.hidden) return;
      aplica(H.turn, decideRival(H.turn));
      pinta(); turnoRivales();
    }, velocidad());
  }
  function pintaPanel(){
    const tab = view.dataset.tab || 'mano';
    view.querySelectorAll('[data-tab]').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
    const box = $('gPanel');
    if (tab === 'mano'){
      box.innerHTML = `<div class="g-log">${H.log.map(l => `<div class="${l.k}">${esc(l.t)}</div>`).join('')}</div>`;
      box.scrollTop = box.scrollHeight;
    } else if (tab === 'repaso'){
      const MARK = { ok: '✓', meh: '≈', bad: '✗' };
      box.innerHTML = H.dec.length ? H.dec.map(d => `<div class="tl-row"><div class="tl-mark ${d.g}">${MARK[d.g]}</div><div>
          <div class="tl-head">${STREETS[d.s]}${d.pista ? ' <small>con pista</small>' : ''}</div>
          <div class="tl-body">Hiciste <b>${E.decisionHTML(d.act)}</b> · RÍO: <b>${E.decisionHTML(d.rec)}</b>. ${d.why}</div></div></div>`).join('')
        : '<p class="hint">Aquí verás cada decisión tuya comparada con lo que haría RÍO.</p>';
    } else {
      const st = stats();
      box.innerHTML = `<div class="g-sesion">
        <div><b>${st.manos}</b><span>manos jugadas</span></div>
        <div><b>${st.dec ? Math.round(st.ok / st.dec * 100) + '%' : '—'}</b><span>decisiones como RÍO</span></div>
        <div><b class="${st.fichas >= 0 ? 'pos' : 'neg'}">${st.fichas >= 0 ? '+' : ''}${fmt(st.fichas)}</b><span>fichas de práctica</span></div>
        <div><b>${st.ganadas || 0}</b><span>manos ganadas</span></div>
        ${st.mejor ? `<div class="wide"><b>${esc(st.mejor.txt)}</b><span>tu mejor jugada ganadora</span></div>` : ''}
      </div>
      <p class="hint">Las fichas no tienen ningún valor: RÍO es una herramienta de estudio.</p>
      <button type="button" class="btn-secondary" id="gReset" style="width:100%;">Empezar de cero (fichas y estadísticas)</button>`;
      $('gReset').addEventListener('click', (e) => {
        if (e.currentTarget.dataset.ok !== '1'){ e.currentTarget.dataset.ok = '1'; e.currentTarget.textContent = '¿Seguro? Toca otra vez'; return; }
        E.storageSet('rio_partidas', { manos: 0, dec: 0, ok: 0, fichas: 0, ganadas: 0, mejor: null });
        nuevaSesion(); nuevaMano(); pinta(); turnoRivales();
      });
    }
  }

  // ---------- Abrir y cerrar ----------
  function abrir(){
    if (!S) cargaSesion();
    if (window.RIO_TRACK) window.RIO_TRACK('practice_started');
    view.hidden = false; document.body.classList.add('game-open');
    if (location.hash !== '#partida') history.pushState(null, '', '#partida');
    if (!H || H.over) nuevaMano();
    view.dataset.tab = view.dataset.tab || 'mano';
    pinta(); turnoRivales();
    $('gClose').focus({ preventScroll: true });
  }
  function cerrar(desdeHistorial){
    clearTimeout(timer);
    view.hidden = true; document.body.classList.remove('game-open');
    if (!desdeHistorial && location.hash === '#partida') history.back();
  }
  $('gClose').addEventListener('click', () => cerrar(false));
  window.addEventListener('popstate', () => { if (location.hash !== '#partida' && !view.hidden) cerrar(true); else if (location.hash === '#partida' && view.hidden) abrir(); });
  view.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => { view.dataset.tab = b.dataset.tab; pintaPanel(); }));
  $('gSpeed').addEventListener('click', () => {
    const r = E.storageGet('rio_pp_speed', 'normal') === 'rapida' ? 'normal' : 'rapida';
    E.storageSet('rio_pp_speed', r); $('gSpeed').textContent = r === 'rapida' ? '⏩ Rápido' : '▶ Normal';
  });
  $('gSpeed').textContent = E.storageGet('rio_pp_speed', 'normal') === 'rapida' ? '⏩ Rápido' : '▶ Normal';
  const selJ = $('gPlayers');
  selJ.value = modo();
  selJ.addEventListener('change', () => {
    E.storageSet('rio_pp_jugadores', selJ.value);
    if (H && !H.over){
      H.log.push({ t: selJ.value === 'var' ? 'Desde la próxima mano, la mesa irá cambiando' : `Desde la próxima mano jugaréis ${selJ.value}`, k: 'info' });
      pintaPanel();
    } else if (H){ nuevaMano(); pinta(); turnoRivales(); }
  });
  document.addEventListener('keydown', (e) => {
    if (view.hidden || e.target.matches('input, textarea, select') || e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key.toLowerCase();
    if (k === 'escape') return cerrar(false);
    if (k === 'f') juegaHeroe('fold'); else if (k === 'c') juegaHeroe('call'); else if (k === 'r') juegaHeroe('raise');
  });
  window.RIO_PARTIDA = { open: abrir, close: () => cerrar(false),
    // Para las pruebas: fichas en juego (deben ser siempre las repartidas más las recargas)
    _fichas: () => (H ? H.p.reduce((t, p) => t + p.stack + p.total * (H.over ? 0 : 1), 0) : 0), _esperadas: () => (S ? S.total : 0) };
  if (location.hash === '#partida') abrir();
})();
