const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { verifyToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');

// GET /api/reports/export/:exam_id — admin only (must come before /:session_id)
router.get('/export/:exam_id', verifyToken, requireRole(['administrator']), reportController.exportCsv);

// GET /api/reports/:session_id — lecturer or admin
router.get('/:session_id', verifyToken, requireRole(['lecturer', 'administrator']), reportController.getReport);

// PATCH /api/reports/:session_id/flag — admin only
router.patch('/:session_id/flag', verifyToken, requireRole(['administrator']), reportController.flagReport);

module.exports = router;
