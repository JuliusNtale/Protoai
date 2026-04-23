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

  const { full_name, registration_number, email, password, role, facial_image_base64 } = req.body;

  const t = await sequelize.transaction();
  try {
    const existing = await User.scope('withPassword').findOne({
      where: { email },
      transaction: t
    });
    if (existing) {
      await t.rollback();
      return res.status(409).json({ error: { code: 'EMAIL_TAKEN', message: 'An account with this email already exists' } });
    }

    const regExists = await User.scope('withPassword').findOne({
      where: { registration_number },
      transaction: t
    });
    if (regExists) {
      await t.rollback();
      return res.status(409).json({ error: { code: 'REG_NUMBER_TAKEN', message: 'An account with this registration number already exists' } });
    }

    const password_hash = await bcrypt.hash(password, 12);

    const user = await User.create({
      full_name,
      registration_number,
      email,
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

    return res.status(201).json({
      user: {
        user_id: user.id,
        registration_number: user.registration_number,
        full_name: user.full_name,
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

  const { email, password } = req.body;

  try {
    const user = await User.scope('withPassword').findOne({ where: { email } });

    const genericError = { error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } };

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
        registration_number: user.registration_number,
        full_name: user.full_name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    logger.error('login error: ' + err.message);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Login failed' } });
  }
}

async function requestPasswordReset(req, res) {
  return res.status(501).json({ error: { code: 'NOT_IMPLEMENTED', message: 'Password reset coming soon' } });
}

async function confirmPasswordReset(req, res) {
  return res.status(501).json({ error: { code: 'NOT_IMPLEMENTED', message: 'Password reset coming soon' } });
}

module.exports = { register, login, requestPasswordReset, confirmPasswordReset };
