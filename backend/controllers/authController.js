'use strict';
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const { validationResult } = require('express-validator');
const { User, FacialImage, sequelize } = require('../models');
const logger = require('../utils/logger');

async function register(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: errors.array()[0].msg } });
  }

  // Accept both 'name' (Julius's field) and 'full_name' (fallback)
  const full_name = req.body.name || req.body.full_name;
  const { registration_number, email, password, role } = req.body;
  // Accept both 'face_image' (Julius's field) and 'facial_image_base64' (fallback)
  const facial_image_base64 = req.body.face_image || req.body.facial_image_base64;

  const t = await sequelize.transaction();
  try {
    const regExists = await User.scope('withPassword').findOne({
      where: { registration_number },
      transaction: t
    });
    if (regExists) {
      await t.rollback();
      return res.status(409).json({ error: { code: 'REG_NUMBER_TAKEN', message: 'An account with this registration number already exists' } });
    }

    if (email) {
      const emailExists = await User.scope('withPassword').findOne({
        where: { email },
        transaction: t
      });
      if (emailExists) {
        await t.rollback();
        return res.status(409).json({ error: { code: 'EMAIL_TAKEN', message: 'An account with this email already exists' } });
      }
    }

    const password_hash = await bcrypt.hash(password, 12);

    // If no email provided (Julius's form doesn't have one), derive a placeholder
    const userEmail = email || `${registration_number.toLowerCase().replace(/[^a-z0-9]/g, '')}@student.udom.ac.tz`;

    const user = await User.create({
      full_name,
      registration_number,
      email: userEmail,
      password_hash,
      role: role || 'student',
      is_active: true
    }, { transaction: t });

    if (facial_image_base64) {
      const storagePath = process.env.STORAGE_PATH || './storage/faces';
      const absStorage = path.resolve(storagePath);

      if (!fs.existsSync(absStorage)) {
        fs.mkdirSync(absStorage, { recursive: true });
      }

      const base64Data = facial_image_base64.replace(/^data:image\/\w+;base64,/, '');
      const imageBuffer = Buffer.from(base64Data, 'base64');
      const imagePath = path.join(absStorage, `${user.id}.jpg`);

      fs.writeFileSync(imagePath, imageBuffer);

      await FacialImage.create({
        student_id: user.id,
        image_path: imagePath
      }, { transaction: t });
    }

    await t.commit();

    const token = jwt.sign(
      { user_id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRY || '8h' }
    );

    return res.status(201).json({
      token,
      user: {
        user_id: user.id,
        name: user.full_name,
        registration_number: user.registration_number,
        regNo: user.registration_number,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    await t.rollback();
    logger.error('register error: ' + err.message);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Registration failed' } });
  }
}

async function login(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: errors.array()[0].msg } });
  }

  // Accept registration_number (Julius's login) OR email (Postman/admin testing)
  const { registration_number, email, password } = req.body;

  try {
    let user;
    if (registration_number) {
      user = await User.scope('withPassword').findOne({ where: { registration_number } });
    } else {
      user = await User.scope('withPassword').findOne({ where: { email } });
    }

    const genericError = { error: { code: 'INVALID_CREDENTIALS', message: 'Invalid registration number or password' } };

    if (!user || !user.is_active) {
      return res.status(401).json(genericError);
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json(genericError);
    }

    const token = jwt.sign(
      { user_id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRY || '8h' }
    );

    return res.status(200).json({
      token,
      user: {
        user_id: user.id,
        name: user.full_name,
        registration_number: user.registration_number,
        regNo: user.registration_number,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    logger.error('login error: ' + err.message);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Login failed' } });
  }
}

async function changePassword(req, res) {
  const { current_password, new_password } = req.body;

  if (!current_password || !new_password) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'current_password and new_password are required' } });
  }
  if (new_password.length < 8) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'New password must be at least 8 characters' } });
  }

  try {
    const user = await User.scope('withPassword').findByPk(req.user.user_id);
    if (!user) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found' } });
    }

    const match = await bcrypt.compare(current_password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Current password is incorrect' } });
    }

    user.password_hash = await bcrypt.hash(new_password, 12);
    await user.save();

    return res.status(200).json({ message: 'Password updated successfully' });
  } catch (err) {
    logger.error('changePassword error: ' + err.message);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to update password' } });
  }
}

async function requestPasswordReset(req, res) {
  return res.status(501).json({ error: { code: 'NOT_IMPLEMENTED', message: 'Password reset coming soon' } });
}

async function confirmPasswordReset(req, res) {
  return res.status(501).json({ error: { code: 'NOT_IMPLEMENTED', message: 'Password reset coming soon' } });
}

module.exports = { register, login, changePassword, requestPasswordReset, confirmPasswordReset };
