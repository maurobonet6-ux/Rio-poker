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

Para «Qué es RÍO», `WARP=0:0,2.05:3.35,3.95:5.55,5.45:7.85 node video-que-es-rio.js` alarga el inicio para que quepa la voz.

`mezclar-voz.py` corta la voz por sus silencios, limpia la voz, baja los efectos mientras se habla y deja
el volumen a -14 LUFS (el de TikTok e Instagram).

## Vídeos automáticos desde datos (n8n → GitHub → Telegram)

`generar.js` hace un vídeo «¿Qué harías tú?» a partir de una mano en JSON, sin tocar `manos.js`:

```bash
node generar.js '{"id":"fd-turn","mano":["Ah","5h"],"mesa":["Kh","9h","4c","2s"],"bote":30,"pagar":10,"gancho":"Proyecto de color en el turn"}'
```

- `bote` = lo que había **más** la apuesta del rival · `pagar` = la apuesta · `stack` (opcional) = fichas del rival (si es ≤ `pagar`, all-in).
- `gancho`, `nota0`, `nota1` (opcionales, sin HTML): el título y las frases del vídeo. Si no se ponen, se usan textos genéricos.
- Si los datos no cuadran, o RÍO recomienda subir/pasar en vez de pagar/tirar, termina con código 2 y un mensaje claro: hay que probar otra mano.
- `node generar.js auto` (o sin argumentos) elige manos al azar hasta que RÍO recomiende pagar o tirar (máximo 8 intentos), sin gastar nada de IA.
- Tarda ~2 minutos. `construir.js` valida los datos y monta el guion; `manos-lista.js` junta estas manos con las de `manos.js`.

El workflow `.github/workflows/video.yml` ejecuta todo en GitHub Actions y manda el mp4 a Telegram. Necesita los secretos
`TELEGRAM_BOT_TOKEN` y `TELEGRAM_CHAT_ID` (Settings → Secrets and variables → Actions). n8n lo lanza con la API de GitHub
(`POST /repos/<dueño>/Rio-poker/actions/workflows/video.yml/dispatches`, con `ref: main` e `inputs.mano` = el JSON como texto).

## Qué se publica en el canal de Telegram (rotación semanal)

| Día | Qué | Quién lo publica |
| --- | --- | --- |
| Lunes, miércoles, domingo | Pregunta del día (quiz) | Vercel, `api/telegram.js` |
| Martes, viernes | Texto con un dato y el enlace a la web (`lib/telegram-textos.js`) | Vercel, `api/telegram.js` |
| Jueves, sábado | Vídeo «¿Qué harías tú?» con una mano al azar | GitHub Actions, `.github/workflows/video.yml` |

- **No se repite nada**: las preguntas y los textos salen en orden y, al acabarse la lista, ese tipo deja de publicarse
  (en vez de volver a empezar). Si defines `TELEGRAM_AVISO_CHAT` en Vercel (tu chat privado con el bot), te avisa una vez.
  Para seguir, hay que añadir ideas nuevas a `lib/telegram-quizzes.js` o `lib/telegram-textos.js`.
- Para el vídeo del canal, añade el secreto `TELEGRAM_CANAL` (por ejemplo `@riopoker_es`) en GitHub; el bot tiene que ser administrador del canal.
- Desde Actions o n8n también se puede mandar un vídeo al canal con `destino = canal`.
