import nodemailer from 'nodemailer';
import logger from './logger.js';

function createTransport() {
  const host = process.env.SMTP_HOST;
  if (host) {
    return nodemailer.createTransport({
      host,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  // Fallback: try Gmail (requires app password)
  if (process.env.GMAIL_USER) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_PASS },
    });
  }

  return null;
}

async function sendEmail({ to, subject, html }) {
  const transporter = createTransport();
  if (!transporter) {
    logger.warn({ to, subject }, 'No SMTP configured — email not sent');
    return false;
  }

  const from = process.env.EMAIL_FROM || `"QuizApp" <${process.env.SMTP_USER || 'noreply@quizapp.local'}>`;

  try {
    await transporter.sendMail({ from, to, subject, html });
    logger.info({ to, subject }, 'Email sent');
    return true;
  } catch (err) {
    logger.error({ err, to, subject }, 'Failed to send email');
    return false;
  }
}

function verificationEmailHtml(token, baseUrl) {
  const link = `${baseUrl}/verify-email?token=${token}`;
  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color: #0C4A4A;">Verify your email</h2>
      <p>Click the link below to verify your email address:</p>
      <a href="${link}" style="display: inline-block; padding: 12px 24px; background: #14a3a8; color: #fff; text-decoration: none; border-radius: 6px; font-weight: 600;">Verify Email</a>
      <p style="margin-top: 24px; font-size: 13px; color: #888;">This link expires in 1 hour.</p>
    </div>`;
}

function resetPasswordHtml(token, baseUrl) {
  const link = `${baseUrl}/reset-password?token=${token}`;
  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color: #0C4A4A;">Reset your password</h2>
      <p>Click the link below to reset your password:</p>
      <a href="${link}" style="display: inline-block; padding: 12px 24px; background: #14a3a8; color: #fff; text-decoration: none; border-radius: 6px; font-weight: 600;">Reset Password</a>
      <p style="margin-top: 24px; font-size: 13px; color: #888;">This link expires in 1 hour. If you did not request this, ignore this email.</p>
    </div>`;
}

export { sendEmail, verificationEmailHtml, resetPasswordHtml };
