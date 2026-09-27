# Vídeos de RÍO para redes

Generador de los vídeos verticales (1080×1920, 30 fps) para TikTok, Reels y Shorts.
Todo sale de la **web real de RÍO**: las manos se analizan con la propia web, así que los
porcentajes de los vídeos son los mismos que daría RÍO.

## Qué vídeos hace

- **`rio-que-es-rio.mp4`** (≈21 s): qué es RÍO y cómo funciona. Para fijarlo en el perfil.
- **`rio-<mano>.mp4`** (≈17 s): uno por cada mano de `manos.js`, con el formato «¿Qué harías tú?».
  Mesa minimalista con los colores de RÍO, cuenta atrás, respuesta de RÍO y el porqué.

El sonido es solo un «whoosh» en las transiciones y un «ding» en la respuesta (sin música,
para poder poner una canción de tendencia al subirlo).

## Cómo generarlos

Hace falta lo mismo que para las pruebas de la web (`npm install`) y, para el sonido y el vídeo:

```bash
pip install numpy imageio-ffmpeg   # imageio-ffmpeg trae ffmpeg; si ya lo tienes instalado, basta con numpy
./marketing/videos/hacer-todos.sh
```

Los vídeos quedan en `marketing/videos/salida/` (esa carpeta no se sube a git).

Para una sola mano: `node capturas-manos.js ak && node video-mesa.js ak`.

## Añadir manos nuevas

Todo está en **`manos.js`**. Copia un bloque y cambia:

- `analisis`: tus cartas y las de la mesa (`Ah` = as de corazones, `Td` = 10 de diamantes; palos `s h d c`),
  `bote` (lo que había **más** la apuesta del rival) y `pagar` (la apuesta).
- `guion`: los textos del vídeo. `G.ganas`, `G.nec`, `G.fz` y `G.ev` son los números reales que calcula RÍO.
- `pots`, `bet`, `vact`, `vstack0`/`vstack`, `call`: lo que se ve en la mesa (bote, fichas, botones).
- `fold: true` si la respuesta es tirar (se pulsa TIRAR y tus cartas van al centro).

## Archivos

| Archivo | Qué hace |
| --- | --- |
| `manos.js` | Las manos y los textos de cada vídeo |
| `capturas-manos.js` | Analiza cada mano con la web y guarda sus números |
| `capturas-web.js` | Capturas de pantallas de la web para «Qué es RÍO» |
| `video-mesa.js` | Monta el vídeo de la mesa de una mano |
| `video-que-es-rio.js` | Monta el vídeo «Qué es RÍO» |
| `audio_mesa.py`, `audio_que_es_rio.py` | Crean los efectos de sonido (sin derechos de autor) |
| `fonts/` | Copia local de las fuentes de la web (Google Fonts, licencia OFL) |

## Poner voz en off

1. Crea la voz (por ejemplo en ttsmaker.com) con **una frase por línea** y descárgala en MP3.
2. Genera el vídeo dando tiempo a la voz y mézclala indicando en qué segundo empieza cada frase:

```bash
cd marketing/videos
FIN=14.45 node video-mesa.js ak          # FIN = segundo en que empieza el final (por defecto 13.5)
python3 mezclar-voz.py salida/rio-ak.mp4 voz.mp3 0.25,3.8,6.3,9.35,10.95,12.85,14.55,15.35,16.5 salida/rio-ak-voz.mp4
```

`mezclar-voz.py` corta la voz por sus silencios, limpia la voz, baja los efectos mientras se habla y deja
el volumen a -14 LUFS (el de TikTok e Instagram).
