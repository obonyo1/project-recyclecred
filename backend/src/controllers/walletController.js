const crypto   = require('crypto');
const { pool } = require('../config/database');

// GET /api/wallet
async function getWallet(req, res, next) {
  try {
    const [wallets] = await pool.query('SELECT * FROM wallets WHERE user_id = ?', [req.user.id]);
    if (wallets.length === 0) return res.status(404).json({ error: 'Wallet not found.' });

    const [txRows] = await pool.query(
      `SELECT t.*, d.name AS device_name
       FROM transactions t
       LEFT JOIN devices d ON d.id = t.device_id
       WHERE t.user_id = ? ORDER BY t.created_at DESC LIMIT 20`,
      [req.user.id]
    );
    res.json({ wallet: wallets[0], transactions: txRows });
  } catch (err) { next(err); }
}

// POST /api/wallet/withdraw
// Body: { amount, phone_number }
// Phase 4: replace mpesaRef placeholder with real Daraja B2C call
async function withdraw(req, res, next) {
  try {
    const { amount, phone_number } = req.body;
    if (!amount || parseFloat(amount) <= 0) return res.status(400).json({ error: 'Invalid amount.' });
    if (!phone_number)                       return res.status(400).json({ error: 'M-Pesa phone number is required.' });

    const [wallets] = await pool.query('SELECT id, balance FROM wallets WHERE user_id = ?', [req.user.id]);
    if (wallets.length === 0) return res.status(404).json({ error: 'Wallet not found.' });

    const wallet = wallets[0];
    if (parseFloat(wallet.balance) < parseFloat(amount)) {
      return res.status(400).json({ error: 'Insufficient balance.' });
    }

    // TODO Phase 4: call Safaricom Daraja B2C API
    const mpesaRef   = `MPESA_PENDING_${Date.now()}`;
    const newBalance = parseFloat(wallet.balance) - parseFloat(amount);

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query('UPDATE wallets SET balance = ? WHERE id = ?', [newBalance, wallet.id]);
      await conn.query(
        `INSERT INTO transactions
           (id, wallet_id, user_id, type, amount, balance_after, description, mpesa_ref)
         VALUES (?, ?, ?, 'withdrawal', ?, ?, ?, ?)`,
        [
          crypto.randomUUID(), wallet.id, req.user.id,
          amount, newBalance,
          `M-Pesa withdrawal to ${phone_number}`, mpesaRef,
        ]
      );
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }

    res.json({
      message:     'Withdrawal initiated. Funds will arrive on M-Pesa shortly.',
      new_balance: newBalance,
      mpesa_ref:   mpesaRef,
    });
  } catch (err) { next(err); }
}

module.exports = { getWallet, withdraw };