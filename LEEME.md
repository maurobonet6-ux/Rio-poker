# RÍO — Despliegue con verificación real de pago

Este proyecto tiene dos partes:
- `index.html` — tu página (el juego/herramienta de poker)
- `api/check-pro.js` — un pequeño servidor que le pregunta a Stripe si un email tiene suscripción activa

## Pasos para publicarlo

1. **Crea las cuentas** (si no las tienes): github.com y vercel.com (entra en Vercel con "Continue with GitHub").

2. **Sube estos archivos a GitHub**
   - Ve a github.com → New repository → ponle un nombre, por ejemplo `rio-poker`.
   - Dentro del repo, usa "Add file → Upload files" y arrastra `index.html`, `LEEME.md` y la carpeta `api` completa (con `check-pro.js` dentro).
   - Confirma los cambios ("Commit changes").

3. **Importa el repo en Vercel**
   - En vercel.com → "Add New… → Project" → elige el repo `rio-poker`.
   - Déjalo con la configuración por defecto (no hace falta tocar nada) → "Deploy".
   - En 1-2 minutos tendrás una URL tipo `https://rio-poker.vercel.app` — esa es tu página real, ya en internet.

4. **Añade tu clave secreta de Stripe**
   - En el proyecto de Vercel → Settings → Environment Variables.
   - Añade una variable: nombre `STRIPE_SECRET_KEY`, valor tu clave secreta de Stripe (la que copiaste en Desarrolladores → Claves API).
   - Guarda y ve a Deployments → vuelve a desplegar (Redeploy) para que la variable se aplique.

5. **Configura tu Payment Link de Stripe**
   - En Stripe → tu Payment Link → edítalo → en "Después del pago" pon que redirija a tu URL de Vercel (ej: `https://rio-poker.vercel.app`).
   - Copia la URL del Payment Link y pégala en `index.html`, en la constante `PAYMENT_LINK` (búscala con Ctrl+F), sustituyendo el texto de ejemplo.
   - Vuelve a subir el `index.html` actualizado a GitHub — Vercel lo redesplegará solo.

## Cómo funciona la verificación

Cuando alguien paga, escribe su email en el botón "Comprobar suscripción" del paywall.
La página le pregunta a `/api/check-pro`, que a su vez le pregunta a Stripe si ese email
tiene una suscripción activa. Si es que sí, se desbloquea RÍO PRO en ese navegador — y
la próxima vez que abra la página, se revalida sola en segundo plano.

Si cancela la suscripción en Stripe, la próxima vez que la página se revalide, PRO se
desactivará automáticamente.
