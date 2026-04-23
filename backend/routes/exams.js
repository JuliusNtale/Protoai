const express = require('express');
const router = express.Router();
const examController = require('../controllers/examController');
const { verifyToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');

// GET /api/exams — all roles, filtered by role in controller
router.get('/', verifyToken, examController.listExams);

// GET /api/exams/:id — includes questions
router.get('/:id', verifyToken, examController.getExam);

// POST /api/exams — lecturer only
router.post('/', verifyToken, requireRole(['lecturer']), examController.createExam);

// PUT /api/exams/:id — lecturer only, own exam
router.put('/:id', verifyToken, requireRole(['lecturer']), examController.updateExam);

// PATCH /api/exams/:id/publish — lecturer or admin
router.patch('/:id/publish', verifyToken, requireRole(['lecturer', 'administrator']), examController.publishExam);

module.exports = router;
