const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

let transporter;

async function createTransporter() {
  if (process.env.EMAIL_MODE === 'dev') {
    try {
      const testAccount = await nodemailer.createTestAccount();
      logger.info(`Ethereal test account created: ${testAccount.user}`);
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: { user: testAccount.user, pass: testAccount.pass }
      });
      logger.info('Mailer: using Ethereal test inbox (EMAIL_MODE=dev)');
    } catch (err) {
      // Ethereal unreachable (no internet) — emails skipped, server still starts
      logger.warn(`Ethereal setup failed (${err.message}). Emails disabled for this session.`);
      transporter = null;
    }
  } else {
    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
  }
  return transporter;
}

function getTransporter() {
  return transporter || null;
}

module.exports = { createTransporter, getTransporter };
