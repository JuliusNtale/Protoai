const express = require('express');
const router = express.Router();
const sessionController = require('../controllers/sessionController');
const logController = require('../controllers/logController');
const { verifyToken, verifyInternalToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');

// POST /api/sessions/start — student only
router.post('/start', verifyToken, requireRole(['student']), sessionController.startSession);

// POST /api/sessions/verify — internal AI service call
router.post('/verify', verifyInternalToken, sessionController.verifyIdentity);

// POST /api/sessions/log — internal AI service call (anomaly ingestion + warning escalation)
router.post('/log', verifyInternalToken, logController.logAnomaly);

// POST /api/sessions/:id/submit — student, own session
router.post('/:id/submit', verifyToken, requireRole(['student']), sessionController.submitSession);

module.exports = router;
