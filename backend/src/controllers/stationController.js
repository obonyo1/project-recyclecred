const { pool } = require('../config/database');

// GET /api/stations?lat=...&lng=...
async function listStations(req, res, next) {
  try {
    const { lat, lng } = req.query;
    let query, params;

    if (lat && lng) {
      query = `
        SELECT *, ROUND(
          6371 * ACOS(
            COS(RADIANS(?)) * COS(RADIANS(latitude)) *
            COS(RADIANS(longitude) - RADIANS(?)) +
            SIN(RADIANS(?)) * SIN(RADIANS(latitude))
          ), 2
        ) AS distance_km
        FROM stations
        WHERE active = 1 AND latitude IS NOT NULL
        ORDER BY distance_km ASC`;
      params = [parseFloat(lat), parseFloat(lng), parseFloat(lat)];
    } else {
      query  = 'SELECT * FROM stations WHERE active = 1 ORDER BY name ASC';
      params = [];
    }

    const [rows] = await pool.query(query, params);
    res.json({ stations: rows });
  } catch (err) { next(err); }
}

// GET /api/stations/:id
async function getStation(req, res, next) {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM stations WHERE id = ? AND active = 1', [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Station not found.' });
    res.json({ station: rows[0] });
  } catch (err) { next(err); }
}

module.exports = { listStations, getStation };