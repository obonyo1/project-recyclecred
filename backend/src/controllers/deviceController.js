/**
 * src/controllers/deviceController.js
 * All device routes require authentication.
 * The pricing estimate is personalised — it requires the logged-in user's
 * income level, proximity, awareness score, hoarding score, and referral flag.
 * There is no public estimate endpoint.
 *
 * Stage 1 (user):  photos submitted → AI scores → C_low/C_high range shown
 * Stage 2 (agent): physical checklist → C_final computed → wallet credited
 */
const crypto   = require('crypto');
const { pool } = require('../config/database');
const { computeStage1 } = require('../utils/pricing');

async function getPricingParams() {
  const [rows] = await pool.query('SELECT * FROM pricing_params WHERE id=1');
  return rows[0] || { alpha:150, c_min:200, m_low:1.05, m_high:1.30, referral_discount:0.30 };
}

async function getCatalogueEntry(make, model) {
  if (!make || !model) return null;
  const [rows] = await pool.query(
    'SELECT * FROM device_catalogue WHERE LOWER(make)=LOWER(?) AND LOWER(model)=LOWER(?)',
    [make, model]
  );
  return rows[0] || null;
}

async function getNearestStationDistance(userLat, userLng) {
  if (!userLat || !userLng) return 5;
  const [rows] = await pool.query(
    `SELECT ROUND(6371 * ACOS(
       COS(RADIANS(?)) * COS(RADIANS(latitude)) *
       COS(RADIANS(longitude) - RADIANS(?)) +
       SIN(RADIANS(?)) * SIN(RADIANS(latitude))
     ), 2) AS dist
     FROM stations WHERE active=1 AND latitude IS NOT NULL
     ORDER BY dist ASC LIMIT 1`,
    [parseFloat(userLat), parseFloat(userLng), parseFloat(userLat)]
  );
  return rows[0]?.dist ?? 5;
}

// GET /api/catalogue/search?q=samsung
async function searchCatalogue(req, res, next) {
  try {
    const q = `%${req.query.q || ''}%`;
    const [rows] = await pool.query(
      `SELECT * FROM device_catalogue
       WHERE make LIKE ? OR model LIKE ?
       ORDER BY make, model LIMIT 20`,
      [q, q]
    );
    res.json({ results: rows });
  } catch (err) { next(err); }
}

// GET /api/devices
async function listDevices(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT d.*, s.name AS station_name, s.location AS station_location
       FROM devices d
       LEFT JOIN stations s ON s.id = d.station_id
       WHERE d.user_id=? ORDER BY d.created_at DESC`,
      [req.user.id]
    );
    res.json({ devices: rows });
  } catch (err) { next(err); }
}

// GET /api/devices/:id
async function getDevice(req, res, next) {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM devices WHERE id=? AND user_id=?',
      [req.params.id, req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Device not found.' });
    res.json({ device: rows[0] });
  } catch (err) { next(err); }
}

// POST /api/devices
// Authenticated user submits device — full Stage 1 pricing computed immediately
// using their personal profile (I, P, A, H, R)
async function addDevice(req, res, next) {
  try {
    const {
      make, model, release_year,
      q_screen, q_body, q_ports,
      imei, serial_number,
      photo_front, photo_back, photo_left, photo_right, photo_imei,
    } = req.body;

    if (!make || !model)
      return res.status(400).json({ error: 'Device make and model are required.' });
    if (q_screen === undefined || q_body === undefined || q_ports === undefined)
      return res.status(400).json({ error: 'Remote quality scores (q_screen, q_body, q_ports) are required from image analysis.' });

    // Load full user profile — needed for every behavioural variable
    const [userRows] = await pool.query(
      `SELECT id, income_level, income_factor, awareness_score,
              referral_flag, registered_lat, registered_lng
       FROM users WHERE id=?`,
      [req.user.id]
    );
    if (userRows.length === 0) return res.status(404).json({ error: 'User not found.' });
    const user = userRows[0];

    const catalogue  = await getCatalogueEntry(make, model);
    const params     = await getPricingParams();
    const distanceKm = await getNearestStationDistance(user.registered_lat, user.registered_lng);

    const omv_kes     = catalogue?.omv_kes           || 0;
    const n           = catalogue?.useful_life_years  || 5;
    const releaseYear = release_year || catalogue?.release_year || (new Date().getFullYear() - 3);

    const deviceForCalc = {
      release_year: releaseYear,
      n,
      omv_kes,
      q_screen: parseFloat(q_screen),
      q_body:   parseFloat(q_body),
      q_ports:  parseFloat(q_ports),
    };

    // computeStage1 uses I, P, A, H, R from the logged-in user
    const stage1 = computeStage1(deviceForCalc, user, params, distanceKm);

    const id   = crypto.randomUUID();
    const name = `${make} ${model}`;

    await pool.query(
      `INSERT INTO devices
         (id, user_id, catalogue_id, imei, serial_number, make, model, name,
          device_type, release_year,
          t, n, D, omv_kes,
          q_screen, q_body, q_ports, q_remote,
          alpha_used, income_factor, proximity_score, awareness_score,
          hoarding_score, referral_flag, referral_discount, beta,
          m_low, m_high, c_low, c_high,
          submitted_at, status)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        id, req.user.id, catalogue?.id || null,
        imei || null, serial_number || null,
        make, model, name,
        catalogue?.category || 'smartphone', releaseYear,
        stage1.t, stage1.n, stage1.D, omv_kes,
        q_screen, q_body, q_ports, stage1.q_remote,
        stage1.alpha_used, stage1.income_factor, stage1.proximity_score, stage1.awareness_score,
        stage1.hoarding_score, stage1.referral_flag, stage1.referral_discount, stage1.beta,
        stage1.m_low, stage1.m_high, stage1.c_low, stage1.c_high,
        stage1.submitted_at, 'pending_agent',
      ]
    );

    // First submission — move awareness from 0 → 0.5 (referred/active user)
    if (parseFloat(user.awareness_score) === 0) {
      await pool.query('UPDATE users SET awareness_score=0.50 WHERE id=?', [req.user.id]);
    }

    const [rows] = await pool.query('SELECT * FROM devices WHERE id=?', [id]);
    res.status(201).json({
      device: rows[0],
      offer: {
        c_low:  stage1.c_low,
        c_high: stage1.c_high,
        beta:   stage1.beta,
      },
      message: `Device submitted. Your personalised offer range: KES ${stage1.c_low.toLocaleString()} – KES ${stage1.c_high.toLocaleString()}. An agent will complete physical verification.`,
    });
  } catch (err) { next(err); }
}

// POST /api/devices/:id/accept-offer
// User confirms they accept the range and selects collection method
async function acceptOffer(req, res, next) {
  try {
    const { collection_mode, station_id, scheduled_date } = req.body;
    if (!collection_mode)
      return res.status(400).json({ error: 'collection_mode is required: drop_off or pickup' });

    const [rows] = await pool.query(
      'SELECT * FROM devices WHERE id=? AND user_id=?',
      [req.params.id, req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Device not found.' });
    const device = rows[0];

    const t_response = device.submitted_at
      ? Math.round((Date.now() - new Date(device.submitted_at).getTime()) / 1000)
      : null;

    await pool.query(
      `UPDATE devices SET
         collection_mode=?,
         station_id=COALESCE(?,station_id),
         scheduled_date=?,
         offer_accepted_at=NOW(),
         t_response_seconds=?,
         status='accepted'
       WHERE id=?`,
      [collection_mode, station_id || null, scheduled_date || null, t_response, device.id]
    );

    const [updated] = await pool.query('SELECT * FROM devices WHERE id=?', [device.id]);
    res.json({ device: updated[0], message: 'Offer accepted. Proceed to your chosen collection point.' });
  } catch (err) { next(err); }
}

// POST /api/devices/:id/reject
async function rejectOffer(req, res, next) {
  try {
    const [rows] = await pool.query(
      'SELECT id FROM devices WHERE id=? AND user_id=?',
      [req.params.id, req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Device not found.' });
    await pool.query("UPDATE devices SET status='rejected' WHERE id=?", [req.params.id]);
    res.json({ message: 'Offer rejected.' });
  } catch (err) { next(err); }
}

module.exports = { searchCatalogue, listDevices, getDevice, addDevice, acceptOffer, rejectOffer };

// GET /api/devices/debug-pricing?make=Samsung&model=Galaxy%20S21
// Shows every variable the formula used — diagnose unexpected prices
async function debugPricing(req, res, next) {
  try {
    const { make, model } = req.query;
    if (!make || !model) return res.status(400).json({ error: 'Pass ?make=...&model=... in the URL' });

    const [userRows] = await pool.query(
      `SELECT id, income_level, income_factor, awareness_score,
              referral_flag, registered_lat, registered_lng
       FROM users WHERE id=?`,
      [req.user.id]
    );
    const user = userRows[0];

    const catalogue  = await getCatalogueEntry(make, model);
    const params     = await getPricingParams();
    const distanceKm = await getNearestStationDistance(user.registered_lat, user.registered_lng);

    const omv_kes     = catalogue?.omv_kes            || 0;
    const n           = catalogue?.useful_life_years   || 5;
    const releaseYear = catalogue?.release_year        || (new Date().getFullYear() - 3);
    const t           = new Date().getFullYear() - releaseYear;

    const pricing = require('../utils/pricing');
    const D        = pricing.computeDepreciation(t, n);
    const q_remote = pricing.computeQRemote({ q_screen:0.75, q_body:0.70, q_ports:0.85 });
    const H        = pricing.computeHoardingScore(t, user.income_level || 'medium');
    const P        = pricing.computeProximityScore(distanceKm);
    const A        = parseFloat(user.awareness_score) || 0;
    const I        = parseFloat(user.income_factor)   || 0.5;
    const R        = user.referral_flag ? 1 : 0;
    const r        = parseFloat(params.referral_discount) || 0.30;
    const alpha    = parseFloat(params.alpha) || 150;
    const beta     = pricing.computeBeta({ alpha, I, P, A, H, R, r });
    const { c_low, c_high } = pricing.computeStage1Range({
      omv_kes, D, Q_remote: q_remote, beta,
      m_low:  parseFloat(params.m_low),
      m_high: parseFloat(params.m_high),
      c_min:  parseFloat(params.c_min),
    });

    res.json({
      catalogue_found: !!catalogue,
      catalogue:       catalogue || 'NOT FOUND — this is why OMV=0',
      pricing_params:  params,
      user_profile: {
        income_level:    user.income_level,
        income_factor:   I,
        awareness_score: A,
        referral_flag:   R,
        has_location:    !!(user.registered_lat && user.registered_lng),
      },
      step_by_step: {
        '1_omv_kes':           omv_kes,
        '2_release_year':      releaseYear,
        '3_age_t':             t,
        '4_useful_life_n':     n,
        '5_depreciation_D':    +D.toFixed(4),
        '6_q_remote':          +q_remote.toFixed(4),
        '7_distance_km':       distanceKm,
        '8_proximity_P':       P,
        '9_awareness_A':       A,
        '10_hoarding_H':       H,
        '11_income_I':         I,
        '12_referral_R':       R,
        '13_alpha':            alpha,
        '14_beta':             beta,
        '15_asset_value_low':  +(omv_kes * D * q_remote * parseFloat(params.m_low)).toFixed(2),
        '16_asset_value_high': +(omv_kes * D * q_remote * parseFloat(params.m_high)).toFixed(2),
        '17_c_low_final':      c_low,
        '18_c_high_final':     c_high,
      },
      diagnosis: omv_kes === 0
        ? 'OMV is 0 → catalogue entry missing or has NULL omv_kes. C falls back to c_min+beta only.'
        : 'OMV found. If price still seems low, check depreciation D and quality Q above.',
    });
  } catch (err) { next(err); }
}

// Re-export with debugPricing added
const original = module.exports;
module.exports = { ...original, debugPricing };