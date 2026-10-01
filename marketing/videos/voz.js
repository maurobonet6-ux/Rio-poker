// Voz en off: prepara el texto de cada frase, llama a voz.py (Kokoro) y devuelve cuánto dura cada una.
// SIN_VOZ=1 la desactiva · VOZ=ef_dora|em_alex|em_santa elige la voz · VELOCIDAD=1.05 el ritmo.
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const { SALIDA } = require('./comun.js');
const { normalizarVoz } = require('./pronunciacion.js');

const VOCES = ['ef_dora', 'em_alex', 'em_santa'];
// Voz principal: Edge TTS (gratis, más natural). VOZ puede ser una de Edge (es-ES-…Neural) o una de Kokoro; si Edge falla se usa Kokoro.
const VOZ_EDGE = 'es-ES-ElviraNeural';
const esEdge = v => /^es-[A-Z]{2}-\w+Neural$/.test(v || '');
// La despedida de todos los vídeos (corta: con voz, cada segundo cuenta).
const CTA = 'Analiza tus manos gratis en riopoker.es.';
const VELOCIDAD_BASE = 1.12, VELOCIDAD_MAX = 1.4;
// Ganchos: lo primero que se oye, para que den ganas de seguir viendo. Sin cifras inventadas: solo curiosidad y retos.
const GANCHOS = {
  mesa: ['¿Pagas o tiras? Piénsalo antes del final.', 'Esta mano parece fácil… no lo es.', '¿Qué harías tú aquí? Decide ya.', 'Un error aquí te cuesta todas las fichas.'],
  concurso: ['¿Aciertas antes de que acabe la cuenta atrás?', '¿Te atreves con esta?', 'A ver cuánto sabes de póker.', 'Nadie debería fallar esta… ¿o sí?'],
  mito: ['Seguro que te lo han contado.', 'Esto lo dicen en todas las mesas.', 'Te lo han dicho mil veces.', 'Mucha gente se lo cree.'],
  lista: ['¿Cuántas conocías?', 'Tres cosas que te harán mejorar.', 'Quédate hasta la última.', 'La tercera es la que más se olvida.'],
};
const gancho = formato => { const l = GANCHOS[formato]; return l[Math.floor(Math.random() * l.length)]; };
const activa = () => process.env.SIN_VOZ !== '1';

// frases: [{ id, texto }] → { dir, dur: { id: segundos }, archivo(id) }. Lanza un Error si no se puede (el vídeo sale entonces sin voz).
function sintetizar(frases, nombre, vel){
  const dir = path.join(SALIDA, 'voz-' + nombre);
  fs.rmSync(dir, { recursive: true, force: true });
  const frasesN = frases.map(f => ({ id: f.id, texto: normalizarVoz(f.texto) }));
  const velocidad = vel || +process.env.VELOCIDAD || VELOCIDAD_BASE;
  const lanzar = (script, voz) => {
    const peticion = { dir, voz, velocidad, frases: frasesN };
    try { return execFileSync('python3', [path.join(__dirname, script), JSON.stringify(peticion)], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 1 << 24 }); }
    catch (e){ throw new Error(String(e.stderr || e.message).trim().split('\n').slice(-1)[0]); }
  };
  const kokoro = VOCES.includes(process.env.VOZ) ? process.env.VOZ : 'ef_dora';
  let salida;
  if (process.env.VOZ_MOTOR !== 'kokoro' && !VOCES.includes(process.env.VOZ)){
    try { salida = lanzar('voz_edge.py', esEdge(process.env.VOZ) ? process.env.VOZ : VOZ_EDGE); }
    catch (e){ console.warn('   · Edge TTS no disponible (' + e.message + '); uso Kokoro'); fs.rmSync(dir, { recursive: true, force: true }); }
  }
  if (!salida){
    try { salida = lanzar('voz.py', kokoro); }
    catch (e){ throw new Error('no se pudo generar la voz (' + e.message + ')'); }
  }
  const dur = JSON.parse(salida.trim().split('\n').pop());
  return { dir, dur, archivo: id => path.join(dir, id + '.wav'), textos: Object.fromEntries(frasesN.map(f => [f.id, f.texto])) };
}

module.exports = { sintetizar, activa, VOCES, CTA, gancho, GANCHOS, VELOCIDAD_BASE, VELOCIDAD_MAX };
