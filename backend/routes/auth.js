'use strict';
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/authController');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'TOO_MANY_REQUESTS', message: 'Too many login attempts. Try again in 15 minutes.' } }
});

const registerValidation = [
  body('full_name').trim().notEmpty().withMessage('Full name is required'),
  body('registration_number').trim().notEmpty().withMessage('Registration number is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('role').optional().isIn(['student', 'lecturer', 'administrator']).withMessage('Invalid role')
];

const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required')
];

// POST /api/auth/register
router.post('/register', registerValidation, authController.register);

// POST /api/auth/login  — rate limited: 5 attempts per 15 min per IP
router.post('/login', loginLimiter, loginValidation, authController.login);

// POST /api/auth/reset-password
router.post('/reset-password', authController.requestPasswordReset);

// POST /api/auth/reset-password/confirm
router.post('/reset-password/confirm', authController.confirmPasswordReset);

module.exports = router;
