# RÍO — Despliegue con verificación real de pago

Este proyecto tiene estas partes:
- `index.html` — tu página (la herramienta de poker)
- `api/send-code.js` y `api/verify-code.js` — inicio de sesión: envían un código de 6 dígitos al email del suscriptor y lo comprueban
- `api/check-pro.js` — le pregunta a Stripe si el usuario con sesión iniciada tiene suscripción activa
- `api/analyze-table.js` — lee una captura de la mesa con Claude (solo PRO, 150 fotos/mes + créditos extra)
- `api/photo-usage.js` — cuántas fotos lleva gastadas el usuario este mes
- `api/redeem-credits.js` — suma los créditos de fotos extra comprados en Stripe
- `lib/` — código compartido (Stripe, Redis y sesiones)

## Pasos para publicarlo

1. **Crea las cuentas** (si no las tienes): github.com y vercel.com (entra en Vercel con "Continue with GitHub").

2. **Sube estos archivos a GitHub**
   - Ve a github.com → New repository → ponle un nombre, por ejemplo `rio-poker`.
   - Dentro del repo, usa "Add file → Upload files" y arrastra `index.html`, `LEEME.md` y las carpetas `api` y `lib` completas.
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
   | `RESEND_API_KEY` | Enviar el código de inicio de sesión por email | resend.com → API Keys |
   | `EMAIL_FROM` | Remitente de ese email, ej: `RÍO <login@tudominio.com>` | Un dominio tuyo verificado en Resend (ver abajo) |
   | `CREDIT_PACK_PRICE_ID` | Reconocer la compra del paquete de fotos extra | Stripe → Catálogo de productos → el paquete → Price ID (`price_...`) |
   | `CREDITS_PER_PACK` | (Opcional) fotos por paquete, por defecto 50 | — |
   | `ADMIN_EMAILS` | (Opcional) emails con PRO gratis, separados por comas | — |

   - Guarda y ve a Deployments → vuelve a desplegar (Redeploy) para que las variables se apliquen.
   - **Sobre Resend:** para poder enviar emails a cualquier persona necesitas verificar un dominio
     propio en Resend (Domains → Add Domain, y copiar los registros DNS que te indica). Sin dominio
     verificado, Resend solo deja enviar emails a tu propia dirección, así que el inicio de sesión
     solo te funcionaría a ti.

5. **Configura tu Payment Link de Stripe**
   - En Stripe → tu Payment Link → edítalo → en "Después del pago" pon que redirija a tu URL de Vercel (ej: `https://rio-poker.vercel.app`).
   - Copia la URL del Payment Link y pégala en `index.html`, en la constante `PAYMENT_LINK` (búscala con Ctrl+F), sustituyendo el texto de ejemplo.
   - Vuelve a subir el `index.html` actualizado a GitHub — Vercel lo redesplegará solo.

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
