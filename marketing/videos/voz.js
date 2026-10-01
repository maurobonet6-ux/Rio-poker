// Voz en off: prepara el texto de cada frase, llama a voz.py (Kokoro) y devuelve cuánto dura cada una.
// SIN_VOZ=1 la desactiva · VOZ=ef_dora|em_alex|em_santa elige la voz · VELOCIDAD=1.05 el ritmo.
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const { SALIDA } = require('./comun.js');
const { normalizarVoz } = require('./pronunciacion.js');

const VOCES = ['ef_dora', 'em_alex', 'em_santa'];
// La despedida de todos los vídeos (corta: con voz, cada segundo cuenta).
const CTA = 'Analiza tus manos gratis en riopoker.es.';
const activa = () => process.env.SIN_VOZ !== '1';

// frases: [{ id, texto }] → { dir, dur: { id: segundos }, archivo(id) }. Lanza un Error si no se puede (el vídeo sale entonces sin voz).
function sintetizar(frases, nombre){
  const dir = path.join(SALIDA, 'voz-' + nombre);
  fs.rmSync(dir, { recursive: true, force: true });
  const voz = VOCES.includes(process.env.VOZ) ? process.env.VOZ : 'ef_dora';
  const peticion = { dir, voz, velocidad: +process.env.VELOCIDAD || 1.12, frases: frases.map(f => ({ id: f.id, texto: normalizarVoz(f.texto) })) };
  let salida;
  try { salida = execFileSync('python3', [path.join(__dirname, 'voz.py'), JSON.stringify(peticion)], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 1 << 24 }); }
  catch (e){ throw new Error('no se pudo generar la voz (' + String(e.stderr || e.message).trim().split('\n').slice(-1)[0] + ')'); }
  const dur = JSON.parse(salida.trim().split('\n').pop());
  return { dir, dur, archivo: id => path.join(dir, id + '.wav'), textos: Object.fromEntries(peticion.frases.map(f => [f.id, f.texto])) };
}

module.exports = { sintetizar, activa, VOCES, CTA };
