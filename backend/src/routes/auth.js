const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const { register, login, verifyEmail, resendVerification, me } = require('../controllers/authController');

const router = express.Router();

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });
  next();
};

router.post('/register',
  [body('email').isEmail().normalizeEmail(), body('password').isLength({ min: 8 })],
  validate, register
);

router.post('/login',
  [body('email').isEmail().normalizeEmail(), body('password').notEmpty()],
  validate, login
);

router.get('/verify-email', verifyEmail);

router.post('/resend-verification',
  [body('email').isEmail().normalizeEmail()],
  validate, resendVerification
);

router.get('/me', authenticate, me);

module.exports = router;