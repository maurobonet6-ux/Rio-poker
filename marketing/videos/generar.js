// Genera el vídeo de una mano a partir de un JSON sencillo (lo que escribe Claude desde n8n).
// Uso: node generar.js '<json>'   ·   node generar.js mano.json
// Escribe en salida/ el vídeo rio-<id>.mp4 y termina con código 0. Si la mano no vale (datos mal,
// o RÍO no recomienda pagar ni tirar) termina con código 2 y un mensaje claro en español.
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const { validar } = require('./construir.js');
const { AUTO } = require('./manos-lista.js');
const { SALIDA } = require('./comun.js');

const arg = process.argv[2] || '';
let datos;
try { datos = JSON.parse(fs.existsSync(arg) ? fs.readFileSync(arg, 'utf8') : arg); }
catch (e) { console.error('El JSON de la mano no es válido'); process.exit(2); }

try { datos = validar(datos); } catch (e) { console.error('Mano no válida: ' + e.message); process.exit(2); }
fs.mkdirSync(AUTO, { recursive: true });
fs.writeFileSync(path.join(AUTO, datos.id + '.json'), JSON.stringify(datos));

const node = (...a) => execFileSync('node', a, { cwd: __dirname, stdio: ['ignore', 'inherit', 'inherit'] });
node('capturas-manos.js', datos.id);
const info = JSON.parse(fs.readFileSync(path.join(SALIDA, datos.id + '-info.json'), 'utf8'));
if (!/PAGA|TIRA/.test(info.badge)){
  console.error(`Mano no válida para el vídeo: RÍO recomienda "${info.badge}" y el formato solo sirve para PAGAR o TIRAR. Prueba otra mano.`);
  process.exit(2);
}
node('video-mesa.js', datos.id);
console.log('LISTO ' + path.join(SALIDA, `rio-${datos.id}.mp4`) + ' · ' + info.badge);
