require('dotenv').config();
const express  = require('express');
const cors     = require('cors');
const { testConnection } = require('./config/database');
const authRoutes  = require('./routes/auth');
const apiRoutes   = require('./routes/api');
const agentRoutes = require('./routes/agent');
const { errorHandler } = require('./middleware/errorHandler');

const app  = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'RecycleCred API' }));

app.use('/api/auth',  authRoutes);
app.use('/api/agent', agentRoutes);
app.use('/api',       apiRoutes);

app.use((req, res) => res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` }));
app.use(errorHandler);

async function start() {
  await testConnection();
  app.listen(PORT, () => {
    console.log(`\n🚀  RecycleCred API → http://localhost:${PORT}`);
    console.log('\n    CUSTOMER AUTH');
    console.log('    POST   /api/auth/register');
    console.log('    POST   /api/auth/login');
    console.log('    GET    /api/auth/verify-email?token=...');
    console.log('    GET    /api/auth/me');
    console.log('\n    AGENT AUTH');
    console.log('    POST   /api/agent/auth/register');
    console.log('    POST   /api/agent/auth/login');
    console.log('    GET    /api/agent/auth/me');
    console.log('\n    CUSTOMER (auth required)');
    console.log('    GET    /api/catalogue/search?q=...');
    console.log('    POST   /api/devices                   ← Stage 1 submit + personalised price');
    console.log('    GET    /api/devices');
    console.log('    GET    /api/devices/:id');
    console.log('    POST   /api/devices/:id/accept-offer');
    console.log('    POST   /api/devices/:id/reject');
    console.log('    GET    /api/wallet');
    console.log('    POST   /api/wallet/withdraw');
    console.log('    GET    /api/stations');
    console.log('\n    AGENT (agent auth required)');
    console.log('    GET    /api/agent/devices              ← queue of submitted devices');
    console.log('    GET    /api/agent/devices/:id');
    console.log('    POST   /api/agent/devices/:id/assess  ← Stage 2 checklist → C_final');
    console.log('    POST   /api/agent/devices/:id/confirm-recycled ← credits wallet');
    console.log('    GET    /api/agent/stats\n');
  });
}

start().catch(err => { console.error('Failed to start:', err.message); process.exit(1); });