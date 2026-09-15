const nodemailer = require('nodemailer');
const config = require('../config/env');

let transporter = null;
function getTransporter() {
  if (!config.smtp.host) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.port === 465,
      auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined,
    });
  }
  return transporter;
}

/**
 * Sends the password reset email via SMTP when credentials are configured.
 * In development without SMTP configured, logs the reset link to the server
 * console instead — the raw token is never returned in the API response in
 * production, and only logged (never returned) in development either.
 */
async function sendPasswordResetEmail(toEmail, token) {
  const resetUrl = `${config.clientOrigin}/reset-password?token=${token}`;
  const t = getTransporter();

  if (!t) {
    // eslint-disable-next-line no-console
    console.log(`[dev-email] Password reset link for ${toEmail}: ${resetUrl}`);
    return { delivered: false, mode: 'dev-log' };
  }

  await t.sendMail({
    from: config.smtp.from,
    to: toEmail,
    subject: 'Reset your password',
    text: `We received a request to reset your password. Use this link (valid for 1 hour): ${resetUrl}\n\nIf you did not request this, you can safely ignore this email.`,
    html: `<p>We received a request to reset your password.</p><p><a href="${resetUrl}">Click here to reset your password</a> (valid for 1 hour).</p><p>If you did not request this, you can safely ignore this email.</p>`,
  });
  return { delivered: true, mode: 'smtp' };
}

module.exports = { sendPasswordResetEmail };
