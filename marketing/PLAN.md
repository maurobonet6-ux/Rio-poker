# Plan de crecimiento de RÍO

Documento común para todas las sesiones de trabajo. Une el prompt del producto y del Content Engine
con el «equipo de marketing» diario. Cada etapa deja la web funcionando y con las pruebas en verde.

## Reglas (no se negocian)

- No se tocan: el motor (RIO_ENGINE, equity, rangos, recomendaciones), Stripe, el webhook, los créditos,
  el inicio de sesión, la sincronización `rio_*`, la IA de captura y de voz, el SEO y el sitemap que ya existen,
  Telegram ni las pruebas que ya existen. Se **amplía** lo que hay; no se duplica.
- Funciones de Vercel: hay 9 de 12. Las rutas nuevas van dentro de `api/account.js` (`lib/routes/`).
- No se inventan datos, estadísticas, testimonios ni resultados. Los números de póker los calcula RÍO.
- Nada se publica en redes sin aprobación humana.
- Prioridad: estabilidad > datos > automatización > retención > crecimiento > escalabilidad.

## El ciclo

```
CONTENIDO → enlace propio (riopoker.es/v/<id>) → LANDING → CUENTA → ANALIZA → ¿TÚ QUÉ HICISTE?
→ ERRORES → ENTRENAMIENTO → PROGRESO → VUELVE → PRO
        ↑                                                              │
        └──── errores anónimos agregados + métricas de cada pieza ─────┘
```

## Lo que ya existe (no rehacer)

| Parte | Dónde |
|---|---|
| ¿Tú qué hiciste? (pagar, subir, tirar) | `app.js` → `renderYouDid`, `saveReviews` (`rio_reviews`, `rio_history`) |
| Mi progreso, historial que se abre, entrenamiento por temas y por errores | `app.js` → `progressData`, `renderHistoryView`, `TRAIN_TOPICS`, `errorSpots` |
| Navegación `#/practicar`, `#/progreso`, `#/historial`, `#/cuenta` | `app.js` → `VIEWS`, `showView` |
| Landing | `descubre/` |
| SEO (guías, glosario, tablas, manos) | `scripts/build-seo.js` |
| Estadísticas por día y origen | `lib/stats.js`, `/api/track`, `/api/stats` (clave `STATS_KEY` para n8n) |
| Canal de Telegram automático | `api/telegram.js`, `lib/telegram-*.js`, `.github/workflows/canal.yml` |
| Vídeos (mesa, concurso, mito, lista) con ✅/❌ | `marketing/videos/`, `.github/workflows/video.yml`, `marketing/n8n/` |

## El equipo de marketing diario

Una **rutina de Claude** (sesión programada) trabaja cada mañana. Hace de:

1. **Investigador**: noticias y torneos de póker, preguntas en Reddit y en foros, formatos que funcionan.
2. **Analista**: `/api/stats` y `/api/content`, para ver qué piezas trajeron cuentas, análisis y PRO, y los errores más comunes (anónimos).
3. **Estratega**: decide las piezas del día y en qué red, mezclando lo que funciona con pruebas.
4. **Guionista**: ganchos, guiones, textos y llamadas a la acción, siempre con números calculados por RÍO.
5. **Productor**: escribe el plan del día (`marketing/equipo/dias/AAAA-MM-DD.json`) y lanza `equipo.yml`, que genera los vídeos y carruseles.
6. **Laboratorio** (una vez por semana): propone un formato nuevo con un vídeo de prueba.

A las **12:00 (hora de España)** llega a Telegram el plan del día, pieza por pieza y por red, con los botones
✅ Publicar · ❌ Descartar · ✏️ Editar · 🔄 Regenerar. Lo aprobado:
- canal de Telegram: se publica solo;
- Instagram y YouTube: por API más adelante (n8n);
- TikTok: llega listo para subirlo a mano (la API de TikTok solo publica en privado hasta pasar su auditoría).

## Etapas

| # | Etapa | Qué | Sesión |
|---|---|---|---|
| 1 | **Medir** | `track()` con los eventos del producto, usuarios únicos, recorrido de los primeros eventos, embudo y retención; enlace `/v/<id>` para atribuir cada pieza; errores anónimos agregados | esta |
| 2 | **Memoria** | Cola de contenidos en Redis (`rio:content:<id>`) y `/api/content`; panel de contenidos en el menú de administrador | esta |
| 3 | **Equipo diario** | Guía del equipo (`marketing/equipo/`), formato del plan del día, `equipo.yml`, rutina diaria y resumen a las 12:00 | esta |
| 4 | **Aprobación** | Botones ✅ ❌ ✏️ 🔄 por pieza en n8n; publicar en el canal; avisos de TikTok listos para subir | vídeos/n8n |
| 5 | **Calidad** | Voz de ElevenLabs con subtítulos palabra a palabra; carruseles en imagen; «1 idea → 5 piezas» desde un JSON maestro | vídeos/n8n |
| 6 | **Aprender** | Métricas por pieza (clics, cuentas, análisis y PRO automáticos; visualizaciones a mano o por API); informe semanal; laboratorio de formatos | esta |
| 7 | **Producto** | Entrenamiento personalizado («hoy entrenamos river porque…»), SEO conectado (manos analizadas dentro de las guías), pulido | esta |

## Modelo de una pieza de contenido

```
id, status (IDEA | GENERATING | READY_FOR_REVIEW | APPROVED | REJECTED | SCHEDULED | PUBLISHED | FAILED),
category (decision | error | mano | educacion | rio | reto), source (motor | errores | educacion | rio | actualidad),
platform (tiktok | instagram | youtube | telegram | seo), topic, hook, title, script, caption, cta, seo_keyword,
hand_data, assets, idea_id (las piezas de una misma idea comparten idea_id),
created_at, scheduled_at, published_at, metrics { views, likes, comments, shares, saves, clicks, cuentas, analisis, pro }
```

## Estado

- [x] Etapa 1 · Medir: `lib/eventos.js`, `/api/track`, `/api/stats?vista=producto|recorridos`, enlace `/v/<id>`, panel «Estadísticas».
- [x] Etapa 2 · Memoria: `lib/contenido.js`, `/api/content`, panel «Contenidos» (menú de administrador).
- [x] Etapa 3 · Equipo diario: `marketing/equipo/` (GUIA.md, plan.js, carrusel.js, produccion.js), `.github/workflows/equipo.yml`,
      botones de Telegram en `lib/content-telegram.js` y nodos de n8n en `marketing/n8n/equipo-botones.json`.
- [ ] Etapa 4 · n8n: importar `marketing/n8n/equipo-botones.json` delante de «¿Es un botón?» (ver su nota). **Sesión de vídeos/n8n.**
- [ ] Etapa 5 · Calidad: voz de ElevenLabs con subtítulos palabra a palabra en `marketing/videos` (`ELEVENLABS_API_KEY` ya llega a `equipo.yml`). **Sesión de vídeos/n8n.**
- [ ] Etapas 6-7.

## Lo que tiene que hacer el dueño (una sola vez)

1. **Una clave de servicio** (`STATS_KEY`, 16+ caracteres, la misma en todos los sitios):
   Vercel → Settings → Environment Variables · GitHub → Settings → Secrets → Actions.
2. **Credencial del entorno de Claude** (para la rutina): claude.ai/code → botón del entorno («Default») encima del cuadro de mensaje →
   engranaje → API credentials → Add credential: sitio `riopoker.es`, cabecera `x-api-key` sin prefijo, valor = la clave.
   Abre también el acceso a riopoker.es (no hace falta tocar Network access).
3. **El mismo bot** en `TELEGRAM_BOT_TOKEN` de Vercel y de GitHub (manda las tarjetas y recibe los botones). En Vercel también `TELEGRAM_CHANNEL` y `ANTHROPIC_API_KEY` (ya están).
4. **n8n:** importar `marketing/n8n/equipo-botones.json` (ver su nota).
5. **ElevenLabs:** la clave en GitHub → Secrets → `ELEVENLABS_API_KEY`.
6. Cuentas de empresa: Instagram profesional, canal de YouTube y TikTok.
7. Cada día a las 12:00, revisar en Telegram (≈5 minutos).
