// Envío de emails (el código de inicio de sesión). Usa Resend si están configuradas
// RESEND_API_KEY y EMAIL_FROM (por ejemplo "RÍO <hola@riopoker.es>"); si no, o si Resend falla, Gmail.
//
// Para Gmail, variables de entorno en Vercel:
//   GMAIL_USER         — la cuenta de Gmail, ej: riopoker.app@gmail.com
//   GMAIL_APP_PASSWORD — una "contraseña de aplicación" de esa cuenta (16 letras)

const nodemailer = require('nodemailer');

function mailConfigured() {
  return !!((process.env.RESEND_API_KEY && process.env.EMAIL_FROM) ||
            (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD));
}

const gmailConfigured = () => !!(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);

async function sendWithResend({ to, subject, text }) {
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: process.env.EMAIL_FROM, to, subject, text })
  });
  if (!r.ok) {
    let detalle = ''; try { detalle = (await r.text()).slice(0, 300); } catch (e) {}
    throw new Error(`Resend rechazó el email (${r.status}): ${detalle}`);
  }
}

async function sendWithGmail({ to, subject, text }) {
  const user = process.env.GMAIL_USER;
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass: (process.env.GMAIL_APP_PASSWORD || '').replace(/\s+/g, '') }
  });
  await transporter.sendMail({ from: `RÍO <${user}>`, to, subject, text });
}

// Usa Resend si está configurado; si Resend falla y también está Gmail, lo intenta con Gmail.
// Cada fallo se apunta en los registros de Vercel (Logs) con el motivo, sin contraseñas.
async function sendMail(msg) {
  if (process.env.RESEND_API_KEY && process.env.EMAIL_FROM) {
    try { await sendWithResend(msg); return; }
    catch (e) {
      console.error('mail: falló Resend:', e.message);
      if (!gmailConfigured()) throw e;
    }
  }
  try { await sendWithGmail(msg); }
  catch (e) {
    console.error('mail: falló Gmail:', e.code || '', e.responseCode || '', (e.response || e.message || '').toString().slice(0, 300));
    throw e;
  }
}

module.exports = { mailConfigured, sendMail };
