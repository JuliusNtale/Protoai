const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

let transporter;

async function createTransporter() {
  if (process.env.EMAIL_MODE === 'dev') {
    const testAccount = await nodemailer.createTestAccount();
    logger.info(`Ethereal test account created: ${testAccount.user}`);
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: { user: testAccount.user, pass: testAccount.pass }
    });
    logger.info('Mailer: using Ethereal test inbox (EMAIL_MODE=dev)');
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
  if (!transporter) throw new Error('Mailer not initialised — call createTransporter() first');
  return transporter;
}

module.exports = { createTransporter, getTransporter };
