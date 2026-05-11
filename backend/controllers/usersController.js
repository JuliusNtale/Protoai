'use strict';
const { User } = require('../models');
const logger = require('../utils/logger');

async function updateProfile(req, res) {
  const { email, phone_number } = req.body;

  if (!email && phone_number === undefined) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Nothing to update' } });
  }

  if (email !== undefined) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid email address' } });
    }
  }

  try {
    const user = await User.findByPk(req.user.user_id);
    if (!user) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found' } });
    }

    if (email && email !== user.email) {
      const taken = await User.findOne({ where: { email } });
      if (taken) {
        return res.status(409).json({ error: { code: 'EMAIL_TAKEN', message: 'That email is already in use' } });
      }
      user.email = email;
    }

    if (phone_number !== undefined) {
      user.phone_number = phone_number || null;
    }

    await user.save();

    return res.status(200).json({
      message: 'Profile updated successfully',
      user: {
        email: user.email,
        phone_number: user.phone_number,
      }
    });
  } catch (err) {
    logger.error('updateProfile error: ' + err.message);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update profile',
        detail: process.env.NODE_ENV !== 'production' ? err.message : undefined
      }
    });
  }
}

module.exports = { updateProfile };
