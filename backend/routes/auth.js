const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken } = require('../middleware/auth');

// POST /api/auth/register
router.post('/register', authController.register);

// POST /api/auth/login
router.post('/login', authController.login);

// POST /api/auth/reset-password  (request reset code)
router.post('/reset-password', authController.requestPasswordReset);

// POST /api/auth/reset-password/confirm  (submit code + new password)
router.post('/reset-password/confirm', authController.confirmPasswordReset);

module.exports = router;
