'use strict';
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const sessionController = require('../controllers/sessionController');
const logController = require('../controllers/logController');
const { verifyToken, verifyInternalToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');

// POST /api/sessions/start — student only
router.post('/start',
  verifyToken,
  requireRole(['student']),
  [body('exam_id').isInt({ min: 1 }).withMessage('exam_id must be a valid integer')],
  sessionController.startSession
);

// POST /api/sessions/verify — internal AI service call (X-Internal-Token)
router.post('/verify', verifyInternalToken, sessionController.verifyIdentity);

// POST /api/sessions/log — internal AI service call (warning escalation)
router.post('/log',
  verifyInternalToken,
  [
    body('session_id').isInt({ min: 1 }).withMessage('session_id is required'),
    body('event_type').isIn([
      // Canonical names
      'gaze_away', 'head_turned', 'tab_switch', 'face_absent', 'multiple_faces',
      // Legacy aliases kept temporarily for backward compatibility
      'head_movement', 'multiple_persons'
    ])
      .withMessage('Invalid event_type')
  ],
  logController.logAnomaly
);

// POST /api/sessions/:id/submit — student, own session
router.post('/:id/submit', verifyToken, requireRole(['student']), sessionController.submitSession);

module.exports = router;
