// Envío de emails (el código de inicio de sesión). Usa Gmail por defecto, o
// Resend si están configuradas RESEND_API_KEY y EMAIL_FROM (útil más adelante,
// cuando tengas un dominio propio).
//
// Para Gmail, variables de entorno en Vercel:
//   GMAIL_USER         — la cuenta de Gmail, ej: riopoker.app@gmail.com
//   GMAIL_APP_PASSWORD — una "contraseña de aplicación" de esa cuenta (16 letras)

const nodemailer = require('nodemailer');

function mailConfigured() {
  return !!((process.env.RESEND_API_KEY && process.env.EMAIL_FROM) ||
            (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD));
}

async function sendMail({ to, subject, text }) {
  if (process.env.RESEND_API_KEY && process.env.EMAIL_FROM) {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: process.env.EMAIL_FROM, to, subject, text })
    });
    if (!r.ok) throw new Error('Resend rechazó el email');
    return;
  }

  const user = process.env.GMAIL_USER;
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass: (process.env.GMAIL_APP_PASSWORD || '').replace(/\s+/g, '') }
  });
  await transporter.sendMail({ from: `RÍO <${user}>`, to, subject, text });
}

module.exports = { mailConfigured, sendMail };
