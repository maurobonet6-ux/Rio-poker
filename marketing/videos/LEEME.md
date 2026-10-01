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

## Qué se publica en el canal de Telegram

El bot (`api/telegram.js`) tiene cinco tipos de publicación. Todos van **en orden y sin repetir**: al acabarse una lista, ese tipo deja de publicarse
(en vez de volver a empezar) y, si defines `TELEGRAM_AVISO_CHAT` en Vercel (tu chat privado con el bot), te avisa una vez.

| Tipo | Qué es | De dónde sale |
| --- | --- | --- |
| `quiz` | Pregunta del día (cuestionario) + enlace a la web | `lib/telegram-quizzes.js` |
| `texto` | Un dato útil con el enlace a la web | `lib/telegram-textos.js` |
| `mito` | «¿Mito o realidad?» como cuestionario de 2 opciones | `lib/poker-mitos.js` |
| `generada` | Cuestionario con una pregunta de cuentas generada y calculada; **nunca se acaba** | `lib/poker-preguntas.js` |
| `encuesta` | Encuesta de opinión, sin respuesta correcta | `lib/telegram-encuestas.js` |
| `resumen` | «📊 Resultados de ayer»: cierra las encuestas de ayer, cuenta los votos y publica el % de aciertos y la correcta | `lib/telegram-comunidad.js` |
| `semana` | «🏆 Lo más difícil de la semana»: las 3 preguntas con menos aciertos y la más fácil | `lib/telegram-comunidad.js` |
| `bienvenida` | Mensaje de presentación que se publica y se **fija** una sola vez (el bot necesita el permiso «Fijar mensajes») | `lib/telegram-comunidad.js` |

Cada encuesta publicada guarda su número de mensaje en Redis (`telegram:poll:<día>:<tipo>`) para que `resumen` pueda cerrarla con `stopPoll` y contar los
votos. Ojo: al cerrarla nadie más puede votar, así que cuentan los votos de las ~15 primeras horas.

| Hora | Qué | Quién lo lanza |
| --- | --- | --- |
| 9:30 | `resumen` (resultados de ayer) | GitHub Actions, `.github/workflows/canal.yml` |
| 10:00 | `mito` | GitHub Actions |
| lunes 10:45 | `semana` | GitHub Actions |
| 13:00 | `generada` | GitHub Actions |
| 17:30 | `encuesta` | GitHub Actions |
| 19:00 | `quiz` o `texto` según el día (quiz dom, mar, jue, sáb; texto lun, mié, vie) | Vercel, cron de `vercel.json` |
| cuando apruebes | el vídeo que pulses con ✅ | n8n |

`canal.yml` necesita el secreto de GitHub `CRON_SECRET`, con el mismo valor que `CRON_SECRET` en Vercel. Se puede probar a mano desde
Actions → Canal de Telegram → Run workflow, eligiendo el tipo. Para añadir ideas, edita el archivo de `lib/` del tipo correspondiente.
- Para el vídeo del canal, el bot de n8n tiene que ser administrador del canal.

## Formatos de vídeo y lote diario

Hay cuatro formatos, todos 1080×1920 con efectos de sonido (sin música):

| Formato | Qué es | Archivos |
| --- | --- | --- |
| `mesa` | «¿Qué harías tú?»: mano en la mesa y veredicto real de RÍO | `video-mesa.js`, `manos.js`, `construir.js` |
| `concurso` | «¿Quién sabe más de póker?»: niveles, 4 respuestas, cuenta atrás, confeti | `video-concurso.js`, `concurso-preguntas.js` |
| `mito` | «¿Mito o realidad?»: afirmación, cuenta atrás y la tarjeta se da la vuelta | `video-mito.js`, `mito-lista-datos.js` |
| `lista` | «Top 3»: tres puntos que van apareciendo | `video-lista.js`, `mito-lista-datos.js` |

`motor.js` graba cualquier página con `render(t)`; `plantilla.js` trae la cabecera y la pantalla final de los formatos mito y lista.
Para un formato nuevo: copia `video-lista.js`, cambia el diseño y el contenido y añádelo a `FORMATOS` y `PESOS` en `generar.js`.

Pedirlos (`node generar.js "<pedido>"`, o el campo *mano* del workflow, o lo que escribas tras `/video` en Telegram):

- `auto` (o nada): cada vídeo sale de un formato distinto al azar. `5` → cinco vídeos.
- `concurso`, `mito`, `lista`, `mesa` → ese formato. `mito 3` → tres vídeos de mito.
- `color`, `ak`, `parejas`, `allin`, `flop`, `turn`, `river` → vídeo de mesa de ese tema (solo formato mesa).
- `Ah Kd | Qs 8c 3h | 18 8` → una mano concreta (tus cartas | mesa | bote | apuesta).

**Preguntas que nunca se repiten ni se equivocan:** el concurso mezcla un banco fijo con generadores que CALCULAN la respuesta
(pot odds, regla del 4 y del 2, SPR, frecuencia del farol, combinaciones). Las pruebas (`tests/unit/concurso.test.js`) recalculan las respuestas.
Los textos de mito y lista salen de las páginas de la web.

**Lote diario con aprobación:** `.github/workflows/video.yml` se lanza cada día (cron `0 7 * * *` = 9:00 en España en verano), hace
`VIDEOS_AL_DIA` vídeos (variable del repositorio; por defecto 5) y los manda a tu chat privado, cada uno con botones ✅ Aprobar / ❌ Descartar.
Nada llega al canal sin que lo apruebes. Para cambiar la hora, edita el `cron` (está en UTC); para cambiar la cantidad, la variable `VIDEOS_AL_DIA`.

## Velocidad

- **Varios navegadores a la vez** (`motor.js`, `renderizarMudo`): los fotogramas de un vídeo se reparten entre tantos navegadores como núcleos tenga la máquina
  (`TRABAJADORES=1` para ir de uno en uno). El resultado es visualmente idéntico (similitud 0,9999) y tarda entre 1,5 y 2 veces menos.
- **Análisis rápido de la mano**: `generar.js` usa `SOLO_ANALISIS=1`, que se salta las capturas carta a carta (solo las necesita el vídeo «Qué es RÍO»).
- **Cada vídeo en su máquina**: el workflow `video.yml` tiene tres tareas. `preparar` reparte el pedido (`node generar.js --plan "<pedido>" <cantidad>`),
  `generar` hace un vídeo por máquina, todas a la vez (hasta 20), y `enviar` los manda juntos a Telegram. Un lote de 10 tarda casi lo mismo que uno solo.
  Si alguno falla, se avisa en tu chat privado con el motivo y los demás llegan igualmente.

## Voz en off y fondos reales

- **Voz en off automática** (`voz.py`, `voz.js`, `pronunciacion.js`, `tiempos.js`): con [Kokoro](https://github.com/thewh1teagle/kokoro-onnx) (código abierto,
  licencia Apache, sin claves ni coste). Voces en español: `ef_dora` (femenina, la de por defecto), `em_alex` y `em_santa` (masculinas); se elige con
  `VOZ=em_alex` (o la variable de GitHub `VOZ`). El modelo (325 MB) se descarga solo de GitHub la primera vez en `marketing/videos/modelos/` (no se sube a git).
  Requiere `pip install kokoro-onnx soundfile`; si no está instalado, el vídeo sale igualmente, sin voz. `SIN_VOZ=1` la quita.
- **La voz encaja con la animación**: cada formato tiene su guion hablado (`narracion()`), con el momento en que empieza cada frase y el siguiente momento de la
  animación que no debe pisar. Si una frase no cabe, la pantalla se queda quieta unos instantes en el último fotograma (`tiempos.js`) y todo lo posterior
  se retrasa lo mismo. La cuenta atrás va sin voz. Los efectos de sonido bajan mientras se habla y el volumen final queda a -15 LUFS.
- **Si una palabra suena mal** (siglas, palabras inglesas del póker): se corrige en `pronunciacion.js`, en la lista `SIGLAS` (escribe cómo se pronuncia).
- **Fondos reales**: ver `fondos/LEEME.md`. El clip va detrás de la animación (no cuesta tiempo extra de verdad: ~25 s en lugar de ~14 s por vídeo corto).
- `DEBUG_TIEMPOS=1` muestra cuánto tarda cada fase.

**Voz principal: Edge TTS** (gratis, voces neuronales de Microsoft, sin clave; `es-ES-ElviraNeural` por defecto). Si falla, se usa Kokoro automáticamente. Para elegir otra, variable `VOZ` = `es-ES-AlvaroNeural`, `es-ES-XimenaNeural`… (o `ef_dora`/`em_alex`/`em_santa` para forzar Kokoro).
