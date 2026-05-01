'use strict';
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/authController');
const { verifyToken } = require('../middleware/auth');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'TOO_MANY_REQUESTS', message: 'Too many login attempts. Try again in 15 minutes.' } }
});

// Registration: accepts 'name' (Julius's field) or 'full_name' (fallback)
const registerValidation = [
  body().custom((_, { req }) => {
    if (!req.body.name && !req.body.full_name) throw new Error('Name is required');
    return true;
  }),
  body('registration_number').trim().notEmpty().withMessage('Registration number is required'),
  body('email').optional().isEmail().normalizeEmail().withMessage('Valid email required if provided'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('role').optional().isIn(['student', 'lecturer', 'administrator']).withMessage('Invalid role')
];

// Login: accepts registration_number (Julius) OR email (admin/Postman testing)
const loginValidation = [
  body().custom((_, { req }) => {
    if (!req.body.registration_number && !req.body.email) {
      throw new Error('Registration number or email is required');
    }
    return true;
  }),
  body('password').notEmpty().withMessage('Password is required')
];

// POST /api/auth/register
router.post('/register', registerValidation, authController.register);

// POST /api/auth/login — rate limited: 5 attempts per 15 min per IP
router.post('/login', loginLimiter, loginValidation, authController.login);

// PUT /api/auth/change-password (requires JWT)
router.put('/change-password', verifyToken, authController.changePassword);

// POST /api/auth/reset-password
router.post('/reset-password', authController.requestPasswordReset);

// POST /api/auth/reset-password/confirm
router.post('/reset-password/confirm', authController.confirmPasswordReset);

module.exports = router;
