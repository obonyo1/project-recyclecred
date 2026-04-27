/**
 * src/middleware/agentAuth.js
 * JWT middleware specifically for agent routes.
 * Attaches req.agent = { id, email, role:'agent' }
 */
const jwt = require('jsonwebtoken');

function authenticateAgent(req, res, next) {
  const header = req.headers['authorization'];
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Agent token required.' });
  }

  const token = header.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'agent') {
      return res.status(403).json({ error: 'Access denied. Agent account required.' });
    }
    req.agent = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Session expired. Please log in again.' });
    }
    return res.status(401).json({ error: 'Invalid token.' });
  }
}

module.exports = { authenticateAgent };
