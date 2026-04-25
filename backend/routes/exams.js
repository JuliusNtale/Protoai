'use strict';
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const examController = require('../controllers/examController');
const { verifyToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');

const examValidation = [
  body('title').trim().notEmpty().withMessage('Exam title is required'),
  body('duration_minutes').isInt({ min: 1 }).withMessage('Duration must be a positive integer (minutes)'),
  body('scheduled_at').optional().isISO8601().withMessage('scheduled_at must be a valid ISO 8601 date'),
  body('questions').optional().isArray().withMessage('questions must be an array')
];

// GET /api/exams — all roles, filtered by role
router.get('/', verifyToken, examController.listExams);

// GET /api/exams/:id — includes questions
router.get('/:id', verifyToken, examController.getExam);

// POST /api/exams — lecturer only
router.post('/', verifyToken, requireRole(['lecturer']), examValidation, examController.createExam);

// PUT /api/exams/:id — lecturer only, own exam
router.put('/:id', verifyToken, requireRole(['lecturer']), examValidation, examController.updateExam);

// PATCH /api/exams/:id/publish — lecturer or admin
router.patch('/:id/publish', verifyToken, requireRole(['lecturer', 'administrator']), examController.publishExam);

module.exports = router;
