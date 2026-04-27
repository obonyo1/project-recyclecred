const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const crypto   = require('crypto');
const { pool } = require('../config/database');
const { sendVerificationEmail } = require('../utils/email');

const INCOME_FACTOR = { low: 0.8, medium: 0.5, high: 0.2 };

// POST /api/auth/register
async function register(req, res, next) {
  try {
    const { email, password, full_name, phone, income_level='medium', referral_code, registered_lat, registered_lng } = req.body;
    if (!email || !password)  return res.status(400).json({ error: 'Email and password are required.' });
    if (password.length < 8)  return res.status(400).json({ error: 'Password must be at least 8 characters.' });

    const normalizedEmail = email.trim().toLowerCase();
    const [existing] = await pool.query('SELECT id FROM users WHERE email=?', [normalizedEmail]);
    if (existing.length > 0)  return res.status(409).json({ error: 'An account with this email already exists.' });

    // Check if referred (referral_code provided)
    const referral_flag = referral_code ? 1 : 0;
    const awareness_score = referral_code ? 0.5 : 0.0; // referred users start at A=0.5
    const income_factor = INCOME_FACTOR[income_level] || 0.5;

    const password_hash          = await bcrypt.hash(password, 12);
    const verify_token           = crypto.randomBytes(32).toString('hex');
    const verify_token_expires   = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const userId                 = crypto.randomUUID();

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query(
        `INSERT INTO users
           (id, email, password_hash, full_name, phone,
            income_level, income_factor, referral_code, referral_flag, awareness_score,
            registered_lat, registered_lng,
            verify_token, verify_token_expires)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          userId, normalizedEmail, password_hash,
          full_name?.trim() || null, phone?.trim() || null,
          income_level, income_factor,
          referral_code?.trim() || null, referral_flag, awareness_score,
          registered_lat || null, registered_lng || null,
          verify_token, verify_token_expires,
        ]
      );
      await conn.query('INSERT INTO wallets (id, user_id, balance) VALUES (?,?,0.00)', [crypto.randomUUID(), userId]);
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }

    try { await sendVerificationEmail(normalizedEmail, verify_token); }
    catch (e) { console.warn('⚠️  Verification email failed:', e.message); }

    res.status(201).json({
      message: 'Account created! Check your email to verify your account.',
      user: { id: userId, email: normalizedEmail },
    });
  } catch (err) { next(err); }
}

// POST /api/auth/login
async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });

    const [rows] = await pool.query(
      'SELECT id, email, password_hash, email_verified FROM users WHERE email=?',
      [email.trim().toLowerCase()]
    );
    if (rows.length === 0) return res.status(401).json({ error: 'Invalid email or password.' });

    const user  = rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid)              return res.status(401).json({ error: 'Invalid email or password.' });
    if (!user.email_verified) {
      return res.status(403).json({ error: 'Please verify your email before logging in. Check your inbox.', code: 'EMAIL_NOT_VERIFIED' });
    }

    const [profiles] = await pool.query(
      'SELECT full_name, phone, income_level, income_factor, awareness_score, wallet_balance FROM (SELECT u.full_name, u.phone, u.income_level, u.income_factor, u.awareness_score, w.balance AS wallet_balance FROM users u LEFT JOIN wallets w ON w.user_id=u.id WHERE u.id=?) t',
      [user.id]
    );
    const profile = profiles[0] || {};

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({ token, user: { id: user.id, email: user.email, ...profile, email_verified: Boolean(user.email_verified) } });
  } catch (err) { next(err); }
}

// GET /api/auth/verify-email?token=...
async function verifyEmail(req, res, next) {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).send('Verification token missing.');

    const [rows] = await pool.query(
      'SELECT id FROM users WHERE verify_token=? AND verify_token_expires>NOW() AND email_verified=0',
      [token]
    );
    if (rows.length === 0) return res.status(400).send('Link is invalid or expired. Please request a new one.');

    await pool.query(
      'UPDATE users SET email_verified=1, verify_token=NULL, verify_token_expires=NULL WHERE id=?',
      [rows[0].id]
    );
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?verified=true`);
  } catch (err) { next(err); }
}

// POST /api/auth/resend-verification
async function resendVerification(req, res, next) {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required.' });

    const [rows] = await pool.query(
      'SELECT id, email_verified FROM users WHERE email=?', [email.trim().toLowerCase()]
    );
    if (rows.length === 0 || rows[0].email_verified)
      return res.json({ message: 'If that address is registered and unverified, a new email has been sent.' });

    const verify_token         = crypto.randomBytes(32).toString('hex');
    const verify_token_expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await pool.query('UPDATE users SET verify_token=?, verify_token_expires=? WHERE id=?', [verify_token, verify_token_expires, rows[0].id]);
    try { await sendVerificationEmail(email.trim().toLowerCase(), verify_token); }
    catch (e) { console.warn('⚠️  Resend failed:', e.message); }

    res.json({ message: 'If that address is registered and unverified, a new email has been sent.' });
  } catch (err) { next(err); }
}

// GET /api/auth/me
async function me(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT u.id, u.email, u.email_verified, u.created_at,
              u.full_name, u.phone, u.income_level, u.income_factor,
              u.awareness_score, u.referral_flag,
              w.balance AS wallet_balance
       FROM users u LEFT JOIN wallets w ON w.user_id=u.id
       WHERE u.id=?`,
      [req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'User not found.' });
    res.json({ user: rows[0] });
  } catch (err) { next(err); }
}

module.exports = { register, login, verifyEmail, resendVerification, me };