const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  host:   process.env.EMAIL_HOST || 'smtp.gmail.com',
  port:   parseInt(process.env.EMAIL_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function sendVerificationEmail(toEmail, token) {
  const url = `${process.env.APP_URL}/api/auth/verify-email?token=${token}`;
  await transporter.sendMail({
    from:    process.env.EMAIL_FROM || 'RecycleCred <noreply@recyclecred.com>',
    to:      toEmail,
    subject: 'Verify your RecycleCred email address',
    html: `
      <div style="font-family:Inter,sans-serif;max-width:520px;margin:0 auto;padding:32px">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:24px">
          <span style="font-size:28px">♻️</span>
          <span style="font-size:20px;font-weight:700;color:#0D3B26">RecycleCred</span>
        </div>
        <h2 style="color:#0D3B26;margin:0 0 12px">Welcome! Please verify your email</h2>
        <p style="color:#4a5568;margin:0 0 24px;line-height:1.6">
          Click the button below to verify your email and activate your account.
        </p>
        <a href="${url}"
           style="display:inline-block;background:#1A6B3C;color:#fff;
                  text-decoration:none;padding:14px 28px;border-radius:8px;
                  font-weight:600;font-size:16px">
          Verify Email Address
        </a>
        <p style="color:#aaa;font-size:12px;margin-top:32px">
          This link expires in 24 hours.<br>
          If you did not sign up for RecycleCred, you can ignore this email.
        </p>
      </div>
    `,
  });
}

async function sendPasswordResetEmail(toEmail, token) {
  const url = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
  await transporter.sendMail({
    from:    process.env.EMAIL_FROM || 'RecycleCred <noreply@recyclecred.com>',
    to:      toEmail,
    subject: 'Reset your RecycleCred password',
    html: `
      <div style="font-family:Inter,sans-serif;max-width:520px;margin:0 auto;padding:32px">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:24px">
          <span style="font-size:28px">♻️</span>
          <span style="font-size:20px;font-weight:700;color:#0D3B26">RecycleCred</span>
        </div>
        <h2 style="color:#0D3B26;margin:0 0 12px">Password Reset Request</h2>
        <p style="color:#4a5568;margin:0 0 24px;line-height:1.6">
          Click below to set a new password. This link expires in 1 hour.
        </p>
        <a href="${url}"
           style="display:inline-block;background:#1A6B3C;color:#fff;
                  text-decoration:none;padding:14px 28px;border-radius:8px;
                  font-weight:600;font-size:16px">
          Reset Password
        </a>
        <p style="color:#aaa;font-size:12px;margin-top:32px">
          If you did not request this, no action is needed.
        </p>
      </div>
    `,
  });
}

module.exports = { sendVerificationEmail, sendPasswordResetEmail };