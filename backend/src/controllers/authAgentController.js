/**
 * src/controllers/authAgentController.js
 * Agent registration and login (separate from customer auth).
 */
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const crypto   = require('crypto');
const { pool } = require('../config/database');

// POST /api/agent/auth/register
async function agentRegister(req, res, next) {
  try {
    const { email, password, full_name, phone, station_id, partner } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });
    if (password.length < 8)  return res.status(400).json({ error: 'Password must be at least 8 characters.' });

    const normalizedEmail = email.trim().toLowerCase();
    const [existing] = await pool.query('SELECT id FROM agents WHERE email=?', [normalizedEmail]);
    if (existing.length > 0) return res.status(409).json({ error: 'An agent account with this email already exists.' });

    const password_hash = await bcrypt.hash(password, 12);
    const agentId       = crypto.randomUUID();

    await pool.query(
      `INSERT INTO agents (id, email, password_hash, full_name, phone, station_id, partner, email_verified)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
      [agentId, normalizedEmail, password_hash, full_name?.trim() || null, phone?.trim() || null, station_id || null, partner?.trim() || null]
    );

    res.status(201).json({
      message: 'Agent account created.',
      agent: { id: agentId, email: normalizedEmail },
    });
  } catch (err) { next(err); }
}

// POST /api/agent/auth/login
async function agentLogin(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });

    const [rows] = await pool.query(
      'SELECT id, email, password_hash, email_verified, full_name, phone, station_id, partner, is_active FROM agents WHERE email=?',
      [email.trim().toLowerCase()]
    );
    if (rows.length === 0) return res.status(401).json({ error: 'Invalid email or password.' });

    const agent = rows[0];
    const valid = await bcrypt.compare(password, agent.password_hash);
    if (!valid)             return res.status(401).json({ error: 'Invalid email or password.' });
    if (!agent.is_active)   return res.status(403).json({ error: 'This agent account has been deactivated.' });

    const token = jwt.sign(
      { id: agent.id, email: agent.email, role: 'agent' },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      token,
      agent: {
        id:         agent.id,
        email:      agent.email,
        full_name:  agent.full_name,
        phone:      agent.phone,
        station_id: agent.station_id,
        partner:    agent.partner,
        role:       'agent',
      },
    });
  } catch (err) { next(err); }
}

// GET /api/agent/auth/me
async function agentMe(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT a.id, a.email, a.full_name, a.phone, a.partner, a.is_active,
              s.name AS station_name, s.location AS station_location, s.address AS station_address
       FROM agents a
       LEFT JOIN stations s ON s.id = a.station_id
       WHERE a.id=?`,
      [req.agent.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Agent not found.' });
    res.json({ agent: rows[0] });
  } catch (err) { next(err); }
}

module.exports = { agentRegister, agentLogin, agentMe };