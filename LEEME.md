# RÍO — Despliegue con verificación real de pago

Este proyecto tiene estas partes:
- `index.html` — tu página (la herramienta de poker)
- `api/send-code.js` y `api/verify-code.js` — inicio de sesión: envían un código de 6 dígitos al email del suscriptor y lo comprueban
- `api/check-pro.js` — le pregunta a Stripe si el usuario con sesión iniciada tiene suscripción activa
- `api/analyze-table.js` — lee una captura de la mesa con Claude (solo PRO, 150 fotos/mes + créditos extra)
- `api/photo-usage.js` — cuántas fotos lleva gastadas el usuario este mes
- `api/redeem-credits.js` — suma los créditos de fotos extra comprados en Stripe
- `api/billing-portal.js` — abre el portal de Stripe para que el suscriptor cancele o cambie la tarjeta
- `api/logout.js` — cierra la sesión
- `manifest.webmanifest`, `sw.js` e `icons/` — permiten instalar RÍO en el móvil como una app
- `lib/` — código compartido (Stripe, Redis, sesiones y envío de emails)
- `package.json` — la librería `nodemailer` para enviar emails con Gmail (Vercel la instala sola)

## Pasos para publicarlo

1. **Crea las cuentas** (si no las tienes): github.com y vercel.com (entra en Vercel con "Continue with GitHub").

2. **Sube estos archivos a GitHub**
   - Ve a github.com → New repository → ponle un nombre, por ejemplo `rio-poker`.
   - Dentro del repo, usa "Add file → Upload files" y arrastra `index.html`, `LEEME.md`, `package.json`, `package-lock.json` y las carpetas `api` y `lib` completas.
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
   | `CREDIT_PACK_PRICE_ID` | Reconocer la compra del paquete de fotos extra | Stripe → Catálogo de productos → el paquete → Price ID (`price_...`) |
   | `CREDITS_PER_PACK` | (Opcional) fotos por paquete, por defecto 50 | — |
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
   - Copia la URL del Payment Link y pégala en `index.html`, en la constante `PAYMENT_LINK` (búscala con Ctrl+F), sustituyendo el texto de ejemplo.
   - Vuelve a subir el `index.html` actualizado a GitHub — Vercel lo redesplegará solo.

6. **Activa el portal de clientes de Stripe** (para el botón "Gestionar suscripción")
   - En Stripe → Configuración → Facturación → **Portal de clientes** → actívalo y guarda.
   - Ahí eliges qué pueden hacer tus suscriptores: cancelar, cambiar la tarjeta, ver facturas…

## Cómo funciona la verificación

Cuando alguien paga, pulsa "Iniciar sesión" en el paywall y escribe su email. La página
llama a `/api/send-code`, que comprueba en Stripe que ese email tiene una suscripción activa
y le envía un código de 6 dígitos (caduca en 10 minutos, máximo 5 intentos). Al escribir el
código, `/api/verify-code` le da a ese navegador un token de sesión válido 90 días. Así nadie
puede usar la cuenta PRO de otro solo sabiendo su email.

Cada vez que se abre la página, se revalida la sesión en segundo plano con `/api/check-pro`.
Si el usuario cancela la suscripción en Stripe, PRO se desactiva automáticamente.

Los usuarios que iniciaron sesión con la versión anterior (solo email, sin código) tendrán
que volver a iniciar sesión una vez.
