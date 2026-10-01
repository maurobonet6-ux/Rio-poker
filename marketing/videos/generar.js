// Genera el vídeo de una mano a partir de un JSON sencillo (lo que escribe Claude desde n8n), o de una mano al azar.
// Uso: node generar.js '<json>'   ·   node generar.js mano.json   ·   node generar.js auto [cantidad]
// Escribe en salida/ el vídeo rio-<id>.mp4 y termina con código 0. Si la mano no vale (datos mal,
// o RÍO no recomienda pagar ni tirar) termina con código 2 y un mensaje claro en español.
// Con "auto" prueba manos al azar hasta que RÍO recomiende pagar o tirar (máximo 8 intentos por vídeo);
// "auto 10" hace un lote de 10 vídeos distintos.
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const { validar } = require('./construir.js');
const { AUTO } = require('./manos-lista.js');
const { SALIDA } = require('./comun.js');

const node = (...a) => execFileSync('node', a, { cwd: __dirname, stdio: ['ignore', 'inherit', 'inherit'] });
const azar = (n) => Math.floor(Math.random() * n);
const elige = (xs) => xs[azar(xs.length)];

function manoAlAzar(){
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

const arg = process.argv[2] || 'auto';
if (arg === 'auto'){
  const cantidad = Math.min(20, Math.max(1, parseInt(process.argv[3], 10) || 1));
  let hechos = 0;
  for (let v = 1; v <= cantidad; v++){
    for (let i = 1; i <= 8; i++){
      const d = validar(manoAlAzar());
      console.log(`Vídeo ${v}/${cantidad} · intento ${i}: ${d.mano.join(' ')} | ${d.mesa.join(' ') || 'sin mesa'} | bote ${d.bote}, pagar ${d.pagar}`);
      if (intentar(d).ok){ hechos++; break; }
    }
  }
  if (hechos === 0){ console.error('Mano no válida: no salió ninguna mano de pagar o tirar. Vuelve a probar.'); process.exit(2); }
  console.log(`LOTE ${hechos}/${cantidad}`);
  process.exit(0);
}

let datos;
try { datos = JSON.parse(fs.existsSync(arg) ? fs.readFileSync(arg, 'utf8') : arg); }
catch (e) { console.error('El JSON de la mano no es válido'); process.exit(2); }
try { datos = validar(datos); } catch (e) { console.error('Mano no válida: ' + e.message); process.exit(2); }
const r = intentar(datos);
if (!r.ok){
  console.error(`Mano no válida para el vídeo: RÍO recomienda "${r.badge}" y el formato solo sirve para PAGAR o TIRAR. Prueba otra mano.`);
  process.exit(2);
}
