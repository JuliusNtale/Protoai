'use strict';
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const { validationResult } = require('express-validator');
const { User, FacialImage, sequelize } = require('../models');
const logger = require('../utils/logger');
const { getTransporter } = require('../config/mailer');

// ── Private helpers ────────────────────────────────────────────────────────────

function maskEmail(email) {
  if (!email) return null;
  const [local, domain] = email.split('@');
  if (!domain) return null;
  const visible = local.slice(0, 2);
  const masked = '*'.repeat(Math.max(local.length - 2, 2));
  return `${visible}${masked}@${domain}`;
}

function maskPhone(phone) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return null;
  return `${'*'.repeat(digits.length - 4)}${digits.slice(-4)}`;
}

function generateTempPassword(length = 10) {
  // Excludes visually ambiguous characters: 0/O, 1/I/l
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// ── Route handlers ─────────────────────────────────────────────────────────────

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

    // Reject if a temporary password was issued but has since expired
    if (user.temp_password_expiry && new Date() > new Date(user.temp_password_expiry)) {
      return res.status(401).json({
        error: {
          code: 'TEMP_PASSWORD_EXPIRED',
          message: 'Your temporary password has expired. Please request a new one.'
        }
      });
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
    user.temp_password_expiry = null; // Clear expiry once user sets a permanent password
    await user.save();

    return res.status(200).json({ message: 'Password updated successfully' });
  } catch (err) {
    logger.error('changePassword error: ' + err.message);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to update password' } });
  }
}

async function lookupUser(req, res) {
  const { registration_number } = req.body;

  if (!registration_number || typeof registration_number !== 'string' || !registration_number.trim()) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Registration number is required' } });
  }

  try {
    const user = await User.scope('withPassword').findOne({
      where: { registration_number: registration_number.trim() }
    });

    // Always return 200 with the same shape — prevents user enumeration
    if (!user || !user.is_active) {
      return res.status(200).json({ email: null, phone: null });
    }

    return res.status(200).json({
      email: maskEmail(user.email),
      phone: maskPhone(user.phone_number)
    });
  } catch (err) {
    logger.error('lookupUser error: ' + err.message);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Lookup failed' } });
  }
}

async function requestPasswordReset(req, res) {
  const { registration_number, recovery_method } = req.body;

  if (!registration_number || !recovery_method) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'registration_number and recovery_method are required' } });
  }
  if (!['email', 'phone'].includes(recovery_method)) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'recovery_method must be "email" or "phone"' } });
  }

  const genericSuccess = { message: 'If an account with that registration number exists, a temporary password has been sent.' };

  try {
    const user = await User.scope('withPassword').findOne({
      where: { registration_number: registration_number.trim() }
    });

    if (!user || !user.is_active) {
      await new Promise(r => setTimeout(r, 300)); // Prevent timing-based enumeration
      return res.status(200).json(genericSuccess);
    }

    if (recovery_method === 'phone') {
      logger.warn(`SMS recovery requested for ${registration_number} — Twilio not configured`);
      return res.status(200).json(genericSuccess);
    }

    const tempPassword = generateTempPassword(10);
    const hashedTemp = await bcrypt.hash(tempPassword, 12);

    user.password_hash = hashedTemp;
    user.temp_password_expiry = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
    await user.save();

    const transporter = getTransporter();
    if (transporter) {
      const appUrl = process.env.APP_URL || 'http://localhost:3000';
      const mailOptions = {
        from: process.env.EMAIL_USER || '"ProctoAI" <noreply@proctoai.udom.ac.tz>',
        to: user.email,
        subject: 'Your ProctoAI Temporary Password',
        html: `
          <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:8px;">
            <div style="text-align:center;margin-bottom:20px;">
              <h1 style="color:#1a2d5a;font-size:22px;margin:0;">ProctoAI</h1>
              <p style="color:#6b7280;font-size:12px;margin:4px 0 0;">University of Dodoma — AI Examination Proctoring</p>
            </div>
            <p style="color:#374151;font-size:15px;">Hello ${user.full_name},</p>
            <p style="color:#374151;font-size:14px;line-height:1.6;">
              A temporary password has been generated for your ProctoAI account
              (<strong>${user.registration_number}</strong>). Use it to sign in, then change your
              password immediately from <strong>Settings → Change Password</strong>.
            </p>
            <div style="background:#1a2d5a;border-radius:8px;padding:20px;margin:20px 0;text-align:center;">
              <p style="margin:0;font-size:11px;color:#93c5fd;text-transform:uppercase;letter-spacing:0.08em;">Your temporary password</p>
              <p style="margin:10px 0 0;font-size:28px;font-weight:bold;color:#ffffff;letter-spacing:0.12em;font-family:monospace;">${tempPassword}</p>
            </div>
            <p style="color:#dc2626;font-size:13px;font-weight:600;">
              ⚠ This password expires in 30 minutes. Change it immediately after logging in.
            </p>
            <p style="color:#374151;font-size:14px;">
              If you did not request this, you can safely ignore this email. Your account remains secure.
            </p>
            <div style="text-align:center;margin-top:24px;">
              <a href="${appUrl}"
                 style="background:#1a2d5a;color:white;padding:12px 28px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600;display:inline-block;">
                Go to Login →
              </a>
            </div>
            <p style="color:#9ca3af;font-size:11px;text-align:center;margin-top:24px;">
              © 2026 University of Dodoma · ProctoAI v1.0
            </p>
          </div>
        `
      };

      try {
        const info = await transporter.sendMail(mailOptions);
        if (process.env.EMAIL_MODE === 'dev') {
          const nodemailer = require('nodemailer');
          const previewUrl = nodemailer.getTestMessageUrl(info);
          logger.info('========================================');
          logger.info(`TEMP PASSWORD for ${user.registration_number}: ${tempPassword}`);
          logger.info(`Email preview URL: ${previewUrl}`);
          logger.info('========================================');
        }
      } catch (mailErr) {
        logger.error('Failed to send temp password email: ' + mailErr.message);
        if (process.env.EMAIL_MODE === 'dev') {
          logger.info('========================================');
          logger.info(`TEMP PASSWORD for ${user.registration_number}: ${tempPassword}`);
          logger.info('(Email delivery failed — use the password above to log in)');
          logger.info('========================================');
        }
      }
    } else {
      logger.warn('Mailer not initialised — temp password email skipped');
      if (process.env.EMAIL_MODE === 'dev') {
        logger.info('========================================');
        logger.info(`TEMP PASSWORD for ${user.registration_number}: ${tempPassword}`);
        logger.info('(No mailer — use the password above to log in)');
        logger.info('========================================');
      }
    }

    return res.status(200).json(genericSuccess);
  } catch (err) {
    logger.error('requestPasswordReset error: ' + err.message);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Password reset failed' } });
  }
}

async function confirmPasswordReset(req, res) {
  return res.status(501).json({ error: { code: 'NOT_IMPLEMENTED', message: 'Password reset coming soon' } });
}

module.exports = { register, login, changePassword, lookupUser, requestPasswordReset, confirmPasswordReset };
