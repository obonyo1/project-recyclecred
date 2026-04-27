/**
 * src/controllers/agentController.js
 * Agent operations — device queue, code lookup, Stage 2 assessment, confirm recycled
 */
const crypto   = require('crypto');
const { pool } = require('../config/database');
const { computeStage2 } = require('../utils/pricing');

// GET /api/agent/devices
// Returns all devices assigned to this agent's station
async function listAgentDevices(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT d.*,
              u.full_name AS user_name, u.phone AS user_phone, u.email AS user_email,
              s.name AS station_name
       FROM devices d
       JOIN users u ON u.id = d.user_id
       LEFT JOIN stations s ON s.id = d.station_id
       WHERE d.station_id = ?
         AND d.status IN ('pending_agent','agent_review','accepted','dropped_off')
       ORDER BY d.submitted_at ASC`,
      [req.agent.station_id]
    );
    res.json({ devices: rows });
  } catch (err) { next(err); }
}

// GET /api/agent/devices/lookup?code=RC-XXXX
// Agent types in the code shown by the user — pulls up the full device record
async function lookupByCode(req, res, next) {
  try {
    const { code } = req.query;
    if (!code) return res.status(400).json({ error: 'Pass ?code=RC-XXXX in the URL' });

    const [rows] = await pool.query(
      `SELECT d.*,
              u.full_name AS user_name, u.phone AS user_phone, u.email AS user_email,
              s.name AS station_name, s.address AS station_address
       FROM devices d
       JOIN users u ON u.id = d.user_id
       LEFT JOIN stations s ON s.id = d.station_id
       WHERE d.handoff_code = ?`,
      [code.toUpperCase().trim()]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        error: `No device found with code ${code.toUpperCase()}. Check the code and try again.`
      });
    }

    const device = rows[0];

    // Check code has not expired (72h window)
    if (device.handoff_code_expires && new Date(device.handoff_code_expires) < new Date()) {
      return res.status(400).json({
        error: 'This handoff code has expired. The user needs to resubmit their device to get a new code.'
      });
    }

    // Block already-completed devices
    if (['recycled', 'rejected'].includes(device.status)) {
      return res.status(400).json({
        error: `This device has already been ${device.status}. No further action needed.`
      });
    }

    // Auto-assign this agent and mark as agent_review
    if (!device.assigned_agent_id) {
      await pool.query(
        `UPDATE devices
         SET assigned_agent_id = ?,
             station_id        = COALESCE(station_id, ?),
             status            = 'agent_review'
         WHERE id = ?`,
        [req.agent.id, req.agent.station_id, device.id]
      );
      device.assigned_agent_id = req.agent.id;
      device.status = 'agent_review';
    }

    res.json({
      device,
      offer_range: { c_low: device.c_low, c_high: device.c_high, beta: device.beta },
      message: `Device found. Customer: ${device.user_name}. Stage 1 offer: KES ${parseFloat(device.c_low).toLocaleString()} – KES ${parseFloat(device.c_high).toLocaleString()}. Proceed with physical assessment.`,
    });
  } catch (err) { next(err); }
}

// GET /api/agent/devices/:id
async function getAgentDevice(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT d.*, u.full_name AS user_name, u.phone AS user_phone
       FROM devices d
       JOIN users u ON u.id = d.user_id
       WHERE d.id = ?
         AND (d.assigned_agent_id = ? OR d.station_id = ?)`,
      [req.params.id, req.agent.id, req.agent.station_id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Device not found or not assigned to your station.' });
    res.json({ device: rows[0] });
  } catch (err) { next(err); }
}

// POST /api/agent/devices/:id/assess
// Agent submits physical checklist — Stage 2 scores → computes C_final
async function submitAssessment(req, res, next) {
  try {
    const { q_function, q_battery, q_camera, q_touch, q_speaker, m_actual, r_recycler, imei_match } = req.body;

    const scores = [q_function, q_battery, q_camera, q_touch, q_speaker];
    if (scores.some(s => s === undefined || s === null)) {
      return res.status(400).json({ error: 'All quality scores are required: q_function, q_battery, q_camera, q_touch, q_speaker.' });
    }
    if (!m_actual) return res.status(400).json({ error: 'm_actual (recycler market multiplier) is required.' });

    const [rows] = await pool.query(
      'SELECT * FROM devices WHERE id = ? AND (assigned_agent_id = ? OR station_id = ?)',
      [req.params.id, req.agent.id, req.agent.station_id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Device not found.' });
    const device = rows[0];

    if (!device.q_remote) {
      return res.status(400).json({ error: 'Device has not completed Stage 1 yet.' });
    }

    const stage2 = computeStage2(
      device,
      { q_function, q_battery, q_camera, q_touch, q_speaker },
      parseFloat(m_actual),
      r_recycler ? parseFloat(r_recycler) : null
    );

    const imeiMatchVal = (imei_match === true || imei_match === 1) ? 1 : 0;

    // IMEI mismatch blocks transaction
    if (!imeiMatchVal) {
      await pool.query(
        "UPDATE devices SET status='rejected', imei_match=0, assigned_agent_id=? WHERE id=?",
        [req.agent.id, device.id]
      );
      return res.status(400).json({
        error: 'IMEI mismatch detected. Transaction blocked and flagged for review.',
        device_id: device.id,
      });
    }

    if (stage2.platform_margin !== null && stage2.platform_margin < 0) {
      console.warn(`⚠️  Negative margin KES ${stage2.platform_margin} for device ${device.id}`);
    }

    await pool.query(
      `UPDATE devices SET
         q_function=?, q_battery=?, q_camera=?, q_touch=?, q_speaker=?,
         q_agent=?, q_final=?,
         m_actual=?, c_final=?, r_recycler=?, platform_margin=?,
         imei_match=?, assigned_agent_id=?,
         status='offer_sent'
       WHERE id=?`,
      [
        q_function, q_battery, q_camera, q_touch, q_speaker,
        stage2.q_agent, stage2.q_final,
        stage2.m_actual, stage2.c_final, stage2.r_recycler, stage2.platform_margin,
        imeiMatchVal, req.agent.id,
        device.id,
      ]
    );

    const [updated] = await pool.query('SELECT * FROM devices WHERE id=?', [device.id]);
    res.json({
      message:  'Assessment complete. Final offer generated.',
      device:   updated[0],
      summary: {
        q_agent:         stage2.q_agent,
        q_final:         stage2.q_final,
        c_final:         stage2.c_final,
        platform_margin: stage2.platform_margin,
        within_range:    stage2.c_final >= parseFloat(device.c_low) && stage2.c_final <= parseFloat(device.c_high),
      },
    });
  } catch (err) { next(err); }
}

// POST /api/agent/devices/:id/confirm-recycled
// Agent confirms device handed over — credits user wallet
async function confirmRecycled(req, res, next) {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM devices WHERE id=? AND (assigned_agent_id=? OR station_id=?)',
      [req.params.id, req.agent.id, req.agent.station_id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Device not found.' });
    const device = rows[0];

    if (!device.c_final) {
      return res.status(400).json({ error: 'No final price set. Complete the assessment first.' });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      await conn.query(
        "UPDATE devices SET status='recycled', cert_data_destruction=1 WHERE id=?",
        [device.id]
      );

      if (parseFloat(device.c_final) > 0) {
        const [walletRows] = await conn.query(
          'SELECT id, balance FROM wallets WHERE user_id=?', [device.user_id]
        );
        if (walletRows.length > 0) {
          const wallet     = walletRows[0];
          const newBalance = parseFloat(wallet.balance) + parseFloat(device.c_final);

          await conn.query('UPDATE wallets SET balance=? WHERE id=?', [newBalance, wallet.id]);
          await conn.query(
            `INSERT INTO transactions (id, wallet_id, user_id, device_id, type, amount, balance_after, description)
             VALUES (?,?,?,?,'credit',?,?,?)`,
            [
              crypto.randomUUID(), wallet.id, device.user_id, device.id,
              device.c_final, newBalance,
              `Credit for recycling: ${device.name || device.model}`,
            ]
          );
          // Repeat recycler — set awareness to 1.0
          await conn.query('UPDATE users SET awareness_score=1.00 WHERE id=?', [device.user_id]);
        }
      }

      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }

    res.json({
      message:      `Device recycled. KES ${device.c_final} credited to user wallet. Certificate of Data Destruction issued.`,
      device_id:    device.id,
      credit_paid:  device.c_final,
    });
  } catch (err) { next(err); }
}

// GET /api/agent/stats
async function agentStats(req, res, next) {
  try {
    const [stats] = await pool.query(
      `SELECT
         COUNT(*)                                              AS total_assessed,
         COUNT(CASE WHEN status='recycled'   THEN 1 END)      AS recycled,
         COUNT(CASE WHEN status='rejected'   THEN 1 END)      AS rejected,
         COUNT(CASE WHEN status IN ('pending_agent','agent_review') THEN 1 END) AS pending,
         COALESCE(SUM(c_final), 0)                            AS total_paid_out,
         COALESCE(SUM(platform_margin), 0)                    AS total_margin
       FROM devices WHERE assigned_agent_id=?`,
      [req.agent.id]
    );
    res.json({ stats: stats[0] });
  } catch (err) { next(err); }
}

module.exports = { listAgentDevices, lookupByCode, getAgentDevice, submitAssessment, confirmRecycled, agentStats };