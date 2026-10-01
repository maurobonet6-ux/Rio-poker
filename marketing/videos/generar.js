// Genera el vídeo de una mano a partir de un JSON sencillo (lo que escribe Claude desde n8n), o de una mano al azar.
// Uso: node generar.js '<json>'   ·   node generar.js mano.json   ·   node generar.js auto [cantidad]
//      node generar.js "concurso 5"         → 5 vídeos de «¿Quién sabe más de póker?» (formatos: mesa, concurso, mito, lista)
//      node generar.js "color 3"            → 3 vídeos de proyectos de color (temas: color, ak, parejas, allin, preflop, flop, turn, river)
//      node generar.js "Ah Kd | Qs 8c 3h | 18 8"  → una mano concreta: tus cartas | mesa | bote | apuesta
// Escribe en salida/ el vídeo rio-<id>.mp4 y termina con código 0. Si la mano no vale (datos mal,
// o RÍO no recomienda pagar ni tirar) termina con código 2 y un mensaje claro en español.
// Con "auto" mezcla formatos al azar (mesa, concurso, mito, lista); en el de mesa prueba manos al azar hasta que RÍO recomiende pagar o tirar (máximo 8 intentos por vídeo);
// "auto 10" hace un lote de 10 vídeos distintos.
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const { validar } = require('./construir.js');
const { AUTO } = require('./manos-lista.js');
const { SALIDA } = require('./comun.js');

const node = (...a) => execFileSync('node', a, { cwd: __dirname, stdio: ['ignore', 'inherit', 'inherit'], env: { ...process.env, SOLO_ANALISIS: '1' } });
const azar = (n) => Math.floor(Math.random() * n);
const elige = (xs) => xs[azar(xs.length)];

// Temas que se pueden pedir: cada uno es una condición sobre la mano repartida.
const palo = c => c[1], valor = c => c[0];
const TEMAS = {
  color: d => d.mesa.length >= 3 && d.mesa.length <= 4 && palo(d.mano[0]) === palo(d.mano[1]) && d.mesa.filter(c => palo(c) === palo(d.mano[0])).length === 2,
  ak: d => [d.mano[0], d.mano[1]].map(valor).sort().join('') === 'AK',
  parejas: d => valor(d.mano[0]) === valor(d.mano[1]),
  allin: d => d.mesa.length === 0,
  preflop: d => d.mesa.length === 0,
  flop: d => d.mesa.length === 3,
  turn: d => d.mesa.length === 4,
  river: d => d.mesa.length === 5,
};

function manoAlAzar(tema){
  if (tema){
    for (let i = 0; i < 20000; i++){ const d = manoAlAzar(); if (TEMAS[tema](d)) return d; }
    throw new Error('no se pudo repartir una mano del tema ' + tema);
  }
  const mazo = [];
  for (const v of '23456789TJQKA') for (const p of 'shdc') mazo.push(v + p);
  for (let i = mazo.length - 1; i > 0; i--){ const j = azar(i + 1); [mazo[i], mazo[j]] = [mazo[j], mazo[i]]; }
  const mesa = elige([0, 3, 3, 4, 4, 5]);
  const d = { id: 'auto-' + Date.now().toString(36) + azar(100), mano: mazo.slice(0, 2), mesa: mazo.slice(2, 2 + mesa) };
  if (mesa === 0){ // antes del flop: las ciegas y un all-in
    const stack = elige([20, 30, 40, 50, 60]);
    return { ...d, bote: stack + 3, pagar: stack, stack };
  }
  const antes = elige([10, 20, 30, 40, 60]);
  const pagar = Math.max(2, Math.round(antes * elige([0.33, 0.5, 0.66, 0.75, 1]) / 2) * 2);
  return { ...d, bote: antes + pagar, pagar };
}

// Analiza la mano con la web y, si RÍO dice PAGA o TIRA, hace el vídeo. Devuelve true si lo hizo.
function intentar(datos){
  fs.mkdirSync(AUTO, { recursive: true });
  fs.writeFileSync(path.join(AUTO, datos.id + '.json'), JSON.stringify(datos));
  node('capturas-manos.js', datos.id);
  const info = JSON.parse(fs.readFileSync(path.join(SALIDA, datos.id + '-info.json'), 'utf8'));
  if (!/PAGA|TIRA/.test(info.badge)){
    for (const f of fs.readdirSync(SALIDA).filter(f => f.startsWith(datos.id + '-'))) fs.rmSync(path.join(SALIDA, f));
    fs.rmSync(path.join(AUTO, datos.id + '.json'));
    return { ok: false, badge: info.badge };
  }
  node('video-mesa.js', datos.id);
  console.log('LISTO ' + path.join(SALIDA, `rio-${datos.id}.mp4`) + ' · ' + info.badge);
  return { ok: true };
}

const arg = (process.argv[2] || 'auto').trim();

// Mano escrita a mano: "Ah Kd | Qs 8c 3h | 18 8"  (tus cartas | mesa | bote | apuesta). La mesa puede ir vacía.
function manoEscrita(texto){
  const [c, m, n] = texto.split('|').map(x => x.trim());
  const cartas = x => (x || '').split(/\s+/).filter(Boolean).map(k => k[0].toUpperCase() + k[1].toLowerCase()).map(k => k.replace(/^1/, 'T'));
  const nums = (n || '').split(/\s+/).filter(Boolean).map(Number);
  return { id: 'mano-' + Date.now().toString(36), mano: cartas(c), mesa: cartas(m), bote: nums[0], pagar: nums[1] };
}

// Formatos de vídeo. Sin pedir ninguno, cada vídeo sale de uno distinto (así no se sube siempre lo mismo).
const FORMATOS = { mesa: 'mesa', concurso: 'concurso', quiz: 'concurso', mito: 'mito', lista: 'lista', top: 'lista' };
// Reparto al azar cuando no se pide formato: más peso a la mesa y al concurso, que son los más completos.
const PESOS = [['mesa', 30], ['concurso', 30], ['mito', 20], ['lista', 20]];
function elegirFormato(){
  let x = Math.random() * PESOS.reduce((a, [, p]) => a + p, 0);
  for (const [f, p] of PESOS){ if ((x -= p) < 0) return f; }
  return 'mesa';
}

// "auto", "5", "color", "concurso 3", "color 3"… → { formato, tema, cantidad }
function pedido(texto, cantidadPorDefecto = process.argv[3]){
  const t = texto.toLowerCase().split(/\s+/).filter(w => w && w !== 'auto');
  const num = t.find(w => /^\d+$/.test(w));
  const tema = t.find(w => TEMAS[w]);
  const formato = FORMATOS[t.find(w => FORMATOS[w])];
  const raro = t.filter(w => w !== num && w !== tema && !FORMATOS[w]);
  if (raro.length) throw new Error('no entiendo "' + raro.join(' ') + '". Formatos: ' + [...new Set(Object.values(FORMATOS))].join(', ') + '. Temas de mesa: ' + Object.keys(TEMAS).join(', ') + '. O una mano como: Ah Kd | Qs 8c 3h | 18 8');
  if (tema && formato && formato !== 'mesa') throw new Error('los temas (' + tema + ') solo valen para el formato mesa');
  return { formato, tema, cantidad: Math.min(20, Math.max(1, parseInt(num || cantidadPorDefecto, 10) || 1)) };
}

// Modo reparto: node generar.js --plan "<pedido>" [cantidad] → escribe {"include":[{"n":1,"pedido":"mito"}, …]}, un vídeo por elemento.
// Lo usa el workflow para hacer cada vídeo en su propia máquina, todas a la vez.
if (process.argv[2] === '--plan'){
  const texto = (process.argv[3] || 'auto').trim();
  let include;
  if (texto.startsWith('{') || texto.includes('|')) include = [{ n: 1, pedido: texto }];
  else {
    let p; try { p = pedido(texto, process.argv[4]); } catch (e){ console.error('Mano no válida: ' + e.message); process.exit(2); }
    include = Array.from({ length: p.cantidad }, (_, i) => ({ n: i + 1, pedido: p.tema || p.formato || elegirFormato() }));
  }
  console.log(JSON.stringify({ include }));
  process.exit(0);
}

let pide = null;
if (!arg.startsWith('{') && !arg.includes('|') && !fs.existsSync(arg)){
  try { pide = pedido(arg); } catch (e){ console.error('Mano no válida: ' + e.message); process.exit(2); }
}
if (pide){
  const { tema, cantidad } = pide;
  let hechos = 0;
  for (let v = 1; v <= cantidad; v++){
    const formato = pide.formato || (tema ? 'mesa' : elegirFormato());
    if (formato !== 'mesa'){
      console.log(`Vídeo ${v}/${cantidad} · formato ${formato}`);
      node('video-' + formato + '.js'); hechos++; continue;
    }
    for (let i = 1; i <= 8; i++){
      const d = validar(manoAlAzar(tema));
      console.log(`Vídeo ${v}/${cantidad} · mesa · intento ${i}: ${d.mano.join(' ')} | ${d.mesa.join(' ') || 'sin mesa'} | bote ${d.bote}, pagar ${d.pagar}`);
      if (intentar(d).ok){ hechos++; break; }
    }
  }
  if (hechos === 0){ console.error('Mano no válida: no salió ninguna mano de pagar o tirar. Vuelve a probar.'); process.exit(2); }
  console.log(`LOTE ${hechos}/${cantidad}`);
  process.exit(0);
}

let datos;
try { datos = arg.includes('|') && !arg.startsWith('{') ? manoEscrita(arg) : JSON.parse(fs.existsSync(arg) ? fs.readFileSync(arg, 'utf8') : arg); }
catch (e) { console.error('El JSON de la mano no es válido'); process.exit(2); }
try { datos = validar(datos); } catch (e) { console.error('Mano no válida: ' + e.message); process.exit(2); }
const r = intentar(datos);
if (!r.ok){
  console.error(`Mano no válida para el vídeo: RÍO recomienda "${r.badge}" y el formato solo sirve para PAGAR o TIRAR. Prueba otra mano.`);
  process.exit(2);
}
