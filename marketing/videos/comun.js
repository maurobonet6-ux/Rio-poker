// Rutas y utilidades comunes de los generadores de vídeos.
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const RAIZ = path.join(__dirname, '..', '..');           // la web de RÍO (index.html)
const SALIDA = path.join(__dirname, 'salida');           // aquí se guardan capturas y vídeos (no se sube a git)
fs.mkdirSync(SALIDA, { recursive: true });

// ffmpeg: el del sistema, o el que trae el paquete de Python imageio-ffmpeg.
function ffmpeg(){
  if (process.env.FF) return process.env.FF;
  try { execSync('ffmpeg -version', { stdio: 'ignore' }); return 'ffmpeg'; } catch (e) {}
  return execSync('python3 -c "import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())"').toString().trim();
}

// Une el vídeo sin sonido con su audio y borra los archivos intermedios.
function unirAudio(mudo, wav, final){
  execSync(`"${ffmpeg()}" -y -loglevel error -i "${mudo}" -i "${wav}" -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart "${final}"`);
  fs.rmSync(mudo); fs.rmSync(wav);
}

module.exports = { RAIZ, SALIDA, ffmpeg, unirAudio, fontRoute: require('./fonts.js') };
