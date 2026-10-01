# Vídeos de fondo (opcional)

Si pones aquí clips de vídeo (`.mp4`, `.mov`, `.webm`), cada vídeo que se genere usará uno **al azar** como fondo, detrás de las
animaciones de RÍO, con un tinte oscuro y el rojo de la marca encima para que todo se lea. Si la carpeta está vacía, los vídeos
llevan el fondo negro de siempre. Con `SIN_FONDO=1` (o la variable de GitHub `SIN_FONDO` = 1) se desactiva.

## Cómo conseguir clips gratis y con licencia
- **Pexels** (pexels.com/videos) y **Pixabay** (pixabay.com/videos): licencia gratuita que permite uso comercial sin atribución.
  Comprueba la licencia de cada clip antes de usarlo y no uses imágenes con marcas visibles ni personas reconocibles.
- Busca: «poker chips», «playing cards», «casino», «card shuffle», «poker table», «blackjack table». Mejor planos lentos y oscuros.
- Vale cualquier formato (vertical u horizontal; se recorta a 1080×1920 solo) y cualquier duración (se repite en bucle).

## Peso
Cada clip se guarda en el repositorio. Mantén **de 6 a 12 clips de 10 a 20 segundos, en 720p y de 2 a 5 MB cada uno**
(con ffmpeg: `ffmpeg -i entrada.mp4 -t 20 -vf scale=-2:720 -an -crf 28 salida.mp4`; `-an` quita el sonido, que no se usa).
