const express = require('express');
const router = express.Router();
const imageController = require('../controllers/imageController');
const { verifyToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');

// GET /api/images/:user_id — administrator only
router.get('/:user_id', verifyToken, requireRole(['administrator']), imageController.getImage);

module.exports = router;
