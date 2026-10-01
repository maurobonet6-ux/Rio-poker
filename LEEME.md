# RÍO — Despliegue con verificación real de pago

Este proyecto tiene estas partes:
- `index.html` — la portada (landing, en «/»); estilos en `landing.css`
- `app/index.html` — la herramienta de poker (en «/app/»); su lógica está en `app.js` y sus estilos en `app.css`
- `api/account.js` + `vercel.json` — agrupan en una sola función las operaciones de cuenta (`lib/routes/`): el plan gratuito de Vercel permite como máximo 12 funciones
- `lib/routes/send-code.js` y `lib/routes/verify-code.js` — inicio de sesión: envían un código de 6 dígitos al email del suscriptor y lo comprueban
- `lib/routes/check-pro.js` — le pregunta a Stripe si el usuario con sesión iniciada tiene suscripción activa
- `api/analyze-table.js` — lee una captura de la mesa con Claude (solo PRO, gasta 1 crédito de IA)
- `api/parse-hand.js` — "Cuéntame tu mano": convierte el relato de una mano (escrito o dictado) en cartas, posiciones y apuestas con Claude (solo PRO, gasta 1 crédito de IA)
- `lib/routes/free-use.js` — cuenta los 10 análisis gratis de cada cuenta gratuita (en el servidor, no en el navegador)
- `api/user-data.js` — guarda en la cuenta el historial, las estadísticas y los ajustes
- `api/stripe-webhook.js` — suma solos los créditos de los packs al comprarlos
- `api/feedback.js` — avisos de "¿consejo raro?" (los ADMIN_EMAILS los leen desde el menú)
- `legal.html` — aviso legal, privacidad, cookies, condiciones y juego responsable
- `og-image.png` — imagen que se ve al compartir la web en WhatsApp, redes, etc.
- `lib/routes/photo-usage.js` — créditos de IA gastados este mes y créditos comprados
- `api/redeem-credits.js` — suma los créditos de los packs comprados en Stripe
- `api/billing-portal.js` — abre el portal de Stripe para que el suscriptor cancele o cambie la tarjeta
- `lib/routes/logout.js` — cierra la sesión
- `manifest.webmanifest`, `sw.js` e `icons/` — permiten instalar RÍO en el móvil como una app
- `lib/` — código compartido (Stripe, Redis, sesiones, cupo de usos de IA y envío de emails)
- `package.json` — la librería `nodemailer` para enviar emails con Gmail (Vercel la instala sola)

## Pasos para publicarlo

1. **Crea las cuentas** (si no las tienes): github.com y vercel.com (entra en Vercel con "Continue with GitHub").

2. **Sube estos archivos a GitHub**
   - Ve a github.com → New repository → ponle un nombre, por ejemplo `rio-poker`.
   - Dentro del repo, usa "Add file → Upload files" y arrastra `index.html`, la carpeta `app`, `app.js`, `app.css`, `LEEME.md`, `package.json`, `package-lock.json` y las carpetas `api` y `lib` completas.
   - Confirma los cambios ("Commit changes").

3. **Importa el repo en Vercel**
   - En vercel.com → "Add New… → Project" → elige el repo `rio-poker`.
   - Déjalo con la configuración por defecto (no hace falta tocar nada) → "Deploy".
   - En 1-2 minutos tendrás una URL tipo `https://rio-poker.vercel.app` — esa es tu página real, ya en internet.

4. **Añade las variables de entorno**
   - En el proyecto de Vercel → Settings → Environment Variables. Añade:

   | Variable | Para qué | Dónde se consigue |
   |---|---|---|
   | `STRIPE_SECRET_KEY` | Comprobar suscripciones y compras | Stripe → Desarrolladores → Claves API |
   | `ANTHROPIC_API_KEY` | Leer las capturas de la mesa | console.anthropic.com → API Keys |
   | `UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN` | Guardar sesiones, fotos usadas y créditos | upstash.com → crea una base de datos Redis → pestaña "REST API" |
   | `GMAIL_USER` | Cuenta de Gmail que envía el código de inicio de sesión, ej: `riopoker.app@gmail.com` | Crea una cuenta de Gmail para la app |
   | `GMAIL_APP_PASSWORD` | Contraseña de aplicación de esa cuenta (16 letras) | Ver abajo |
   | `CREDIT_PACKS` | (Opcional) Reconocer los packs por su Price ID: `priceId:créditos`, p. ej. `price_AAA:100`. Si no se pone, se reconocen por importe: 2,99 € → 100, 6,99 € → 300, 17,99 € → 1.000 (`CREDIT_PACK_AMOUNTS` para cambiarlo) | Stripe → Catálogo de productos → cada pack → Price ID (`price_...`) |
   | `CREDIT_PACK_PRICE_ID` y `CREDITS_PER_PACK` | (Antiguo) el pack de 50 créditos; se sigue reconociendo | — |
   | `STATS_KEY` | (Opcional) clave larga (16+ caracteres) para que n8n lea `/api/stats` con la cabecera `x-api-key` | — |
   | `ADMIN_EMAILS` | (Opcional) emails con PRO gratis, separados por comas | — |

   - Guarda y ve a Deployments → vuelve a desplegar (Redeploy) para que las variables se apliquen.
   - **Contraseña de aplicación de Gmail** (no es la contraseña normal):
     1. Entra en esa cuenta de Gmail → myaccount.google.com → Seguridad → activa la **Verificación en dos pasos**.
     2. Ve a myaccount.google.com/apppasswords → escribe un nombre (ej: `RIO`) → Crear.
     3. Copia las 16 letras que salen y pégalas en `GMAIL_APP_PASSWORD`.
   - Gmail permite unos 500 emails al día. Si algún día necesitas más, compra un dominio, verifícalo
     en resend.com y añade `RESEND_API_KEY` y `EMAIL_FROM` (ej: `RÍO <login@tudominio.com>`):
     si están puestas, se usa Resend en vez de Gmail.

5. **Configura tu Payment Link de Stripe**
   - En Stripe → tu Payment Link → edítalo → en "Después del pago" pon que redirija a tu URL de Vercel (ej: `https://rio-poker.vercel.app`).
   - Copia la URL del Payment Link y pégala en `app.js`, en la constante `PAYMENT_LINK` (búscala con Ctrl+F), sustituyendo el texto de ejemplo.
   - Vuelve a subir el `app.js` actualizado a GitHub — Vercel lo redesplegará solo.

6. **Activa el portal de clientes de Stripe** (para el botón "Gestionar suscripción")
   - En Stripe → Configuración → Facturación → **Portal de clientes** → actívalo y guarda.
   - Ahí eliges qué pueden hacer tus suscriptores: cancelar, cambiar la tarjeta, ver facturas…

7. **Rellena los textos legales**
   - En `legal.html` hay datos marcados como **[PENDIENTE]** (titular, NIF, dirección, email, fecha, IVA). Rellénalos antes de publicar y, a ser posible, que los revise un profesional.

8. **Activa las estadísticas de visitas**
   - En Vercel → tu proyecto → pestaña **Analytics** → **Enable**. Son gratis y no usan cookies.

9. **Créditos automáticos al comprar packs** (opcional, recomendado)
   - Stripe → Desarrolladores → **Webhooks** → Añadir endpoint.
   - URL: `https://TU-WEB/api/stripe-webhook` · Evento: `checkout.session.completed`.
   - No hace falta copiar ningún "signing secret": la función vuelve a pedir el evento a Stripe con tu clave.

10. **Plan anual** (opcional)
    - Crea en Stripe un precio anual y su Payment Link.
    - En `app.js`, rellena `ANNUAL_PAYMENT_LINK` y `ANNUAL_PRICE_LABEL` (búscalos con Ctrl+F). El botón aparece solo.

11. **Imagen al compartir**
    - La dirección de la web está en un solo sitio: `sitio.json`. Si cambias de dominio, cámbiala ahí y ejecuta `node scripts/build-seo.js`: actualiza la dirección canónica, `og:url`, `og:image`, los datos para Google de la portada, el sitemap y todas las páginas del glosario y las tablas.
    - Las preguntas frecuentes de la portada se escriben en `app/index.html` (bloque «Preguntas frecuentes»); el mismo script las copia a los datos para Google.

12. **Precios (PRO 9,99 € con 200 créditos/mes y packs de créditos)**
    - En Stripe crea el precio mensual de 9,99 € de RÍO PRO y su Payment Link; pégalo en `PAYMENT_LINK` en `app.js`.
    - Crea los packs (pago único): 100 créditos · 2,99 €, 300 · 6,99 €, 1.000 · 17,99 €, con un Payment Link cada uno. Pega los enlaces en `CREDIT_PACKS_UI` (`app.js`). Los créditos se reconocen por el importe pagado (ver `lib/packs.js`); si cambias los precios, pon `CREDIT_PACK_AMOUNTS` en Vercel.
    - Los créditos incluidos al mes están en `MONTHLY_CREDITS` (`lib/quota.js` y `app.js`).

## Cómo funciona la verificación

Cualquiera puede crear una cuenta gratis con su email (sin contraseña): los 10 análisis gratis van ligados a esa cuenta y se cuentan en el servidor. Cuando alguien paga, entra con el mismo email. La página
llama a `/api/send-code`, que comprueba en Stripe que ese email tiene una suscripción activa
y le envía un código de 6 dígitos (caduca en 10 minutos, máximo 5 intentos). Al escribir el
código, `/api/verify-code` le da a ese navegador un token de sesión válido 90 días. Así nadie
puede usar la cuenta PRO de otro solo sabiendo su email.

Cada vez que se abre la página, se revalida la sesión en segundo plano con `/api/check-pro`.
Si el usuario cancela la suscripción en Stripe, PRO se desactiva automáticamente.

Los usuarios que iniciaron sesión con la versión anterior (solo email, sin código) tendrán
que volver a iniciar sesión una vez.

## Páginas para Google (glosario y tablas)

Las carpetas `glosario/` y `tablas/`, `seo.css`, `sitemap.xml` y `robots.txt` se generan con:

    node scripts/build-seo.js

Vuelve a ejecutarlo si cambias los textos del glosario o los rangos (están en ese mismo archivo) y sube los cambios. Cuando la web esté publicada, puedes dar de alta `https://rio-poker.vercel.app/sitemap.xml` en Google Search Console para que Google las encuentre antes.

## Canal de Telegram (pregunta del día)

`api/telegram.js` publica cada día, sobre las 19:00 (hora de España en verano; 18:00 en invierno),
una encuesta tipo cuestionario en el canal y un mensaje con el enlace a la página que la explica.
Las preguntas están en `lib/telegram-quizzes.js`; al acabar la lista vuelve a empezar. La hora
está en `vercel.json` → `crons` (en UTC).

1. En Telegram, habla con **@BotFather** → `/newbot` y guarda el token que te da.
2. Añade el bot como **administrador** de tu canal (con permiso para publicar).
3. En Vercel → Settings → Environment Variables añade:
   - `TELEGRAM_BOT_TOKEN`: el token del paso 1.
   - `TELEGRAM_CHANNEL`: el canal con @, por ejemplo `@riopoker`.
   - `CRON_SECRET`: cualquier clave larga inventada (Vercel la usa para lanzar el cron).
4. Vuelve a desplegar. Para probarlo sin esperar: Vercel → Settings → Cron Jobs → **Run**.

## Pruebas automáticas

En `tests/` están las pruebas de RÍO:

- `tests/unit/`: pruebas rápidas, sin navegador (packs de créditos, respuestas de la IA, funciones de `/api`, páginas del glosario y de las tablas).
- `tests/web/`: abren la web en un navegador (ordenador y móvil) y hacen lo que haría un usuario: elegir cartas, analizar, la mano de ejemplo, compartir, el historial, la captura… El servidor (`/api`) se simula, así que no se toca Stripe ni la IA.

GitHub las ejecuta solas en cada petición de cambio (`.github/workflows/pruebas.yml`): verás un ✅ o una ❌ en la petición. Para ejecutarlas en tu ordenador:

    npm install
    npx playwright install chromium
    npm test
