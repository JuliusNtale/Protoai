'use strict';
const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const usersController = require('../controllers/usersController');

// PUT /api/users/profile (requires JWT)
router.put('/profile', verifyToken, usersController.updateProfile);

module.exports = router;
