#!/usr/bin/env bash
# Genera todos los vídeos en marketing/videos/salida/.
set -euo pipefail
cd "$(dirname "$0")"
node capturas-manos.js                    # analiza cada mano de manos.js con la web real
node capturas-web.js                      # pantallas de la web para "Qué es RÍO"
node video-que-es-rio.js                  # vídeo para fijar en el perfil
for mano in $(node -e "console.log(Object.keys(require('./manos.js')).join(' '))"); do
  node video-mesa.js "$mano"              # un vídeo "¿Qué harías tú?" por mano
done
