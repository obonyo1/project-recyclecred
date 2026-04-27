const express = require('express');
const { authenticateAgent } = require('../middleware/agentAuth');
const { agentRegister, agentLogin, agentMe } = require('../controllers/authAgentController');
const { listAgentDevices, getAgentDevice, submitAssessment, confirmRecycled, agentStats } = require('../controllers/agentController');

const router = express.Router();

// ── Agent auth (public) ───────────────────────────────────
router.post('/auth/register', agentRegister);
router.post('/auth/login',    agentLogin);
router.get ('/auth/me',       authenticateAgent, agentMe);

// ── Agent dashboard (protected) ───────────────────────────
router.use(authenticateAgent);
router.get ('/devices',                    listAgentDevices);
router.get ('/devices/:id',                getAgentDevice);
router.post('/devices/:id/assess',         submitAssessment);
router.post('/devices/:id/confirm-recycled', confirmRecycled);
router.get ('/stats',                      agentStats);

module.exports = router;