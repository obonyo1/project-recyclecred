const express = require('express');
const { authenticate } = require('../middleware/auth');
const { searchCatalogue, listDevices, getDevice, addDevice, acceptOffer, rejectOffer, debugPricing } = require('../controllers/deviceController');
const { getWallet, withdraw }   = require('../controllers/walletController');
const { listStations, getStation } = require('../controllers/stationController');

const router = express.Router();

// Catalogue search — authenticated (user must be logged in to get personalised pricing)
router.get('/catalogue/search', authenticate, searchCatalogue);

// All device, wallet, station routes require auth
router.use(authenticate);

router.get ('/devices/debug-pricing',   debugPricing);
router.get ('/devices',                 listDevices);
router.post('/devices',                 addDevice);
router.get ('/devices/:id',             getDevice);
router.post('/devices/:id/accept-offer', acceptOffer);
router.post('/devices/:id/reject',      rejectOffer);

router.get ('/wallet',          getWallet);
router.post('/wallet/withdraw', withdraw);

router.get('/stations',     listStations);
router.get('/stations/:id', getStation);

module.exports = router;