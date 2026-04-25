'use strict';
const nodemailer = require('nodemailer');
const { getTransporter } = require('../config/mailer');
const { ExamSession, BehavioralLog, User, Examination } = require('../models');
const logger = require('../utils/logger');

async function sendLecturerAlert(session_id) {
  try {
    const session = await ExamSession.findByPk(session_id, {
      include: [
        { model: User, as: 'student', attributes: ['full_name', 'registration_number', 'email'] },
        { model: Examination, as: 'exam', attributes: ['title', 'created_by'],
          include: [{ model: User, as: 'creator', attributes: ['full_name', 'email'] }] }
      ]
    });

    if (!session) {
      logger.warn(`sendLecturerAlert: session ${session_id} not found`);
      return;
    }

    const logs = await BehavioralLog.findAll({
      where: { session_id },
      order: [['event_timestamp', 'ASC']]
    });

    const student = session.student;
    const exam = session.exam;
    const lecturer = exam?.creator;

    const logRows = logs.map(l =>
      `<tr>
        <td style="padding:4px 8px;border:1px solid #ddd">${l.event_type}</td>
        <td style="padding:4px 8px;border:1px solid #ddd">${new Date(l.event_timestamp).toISOString()}</td>
        <td style="padding:4px 8px;border:1px solid #ddd">${JSON.stringify(l.metadata)}</td>
      </tr>`
    ).join('');

    const html = `
<!DOCTYPE html>
<html>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
  <div style="background:#c0392b;color:#fff;padding:16px;border-radius:4px 4px 0 0">
    <h2 style="margin:0">⚠ EXAM INTEGRITY ALERT — Session Locked</h2>
  </div>
  <div style="padding:16px;border:1px solid #ddd;border-top:none">
    <p><strong>Risk Level:</strong> <span style="color:#c0392b;font-weight:bold">HIGH</span></p>

    <h3>Student Details</h3>
    <table style="border-collapse:collapse;width:100%">
      <tr><td style="padding:4px 8px;width:40%;background:#f5f5f5"><strong>Name</strong></td><td style="padding:4px 8px">${student?.full_name || 'Unknown'}</td></tr>
      <tr><td style="padding:4px 8px;background:#f5f5f5"><strong>Registration No.</strong></td><td style="padding:4px 8px">${student?.registration_number || 'Unknown'}</td></tr>
      <tr><td style="padding:4px 8px;background:#f5f5f5"><strong>Exam</strong></td><td style="padding:4px 8px">${exam?.title || 'Unknown'}</td></tr>
      <tr><td style="padding:4px 8px;background:#f5f5f5"><strong>Warnings</strong></td><td style="padding:4px 8px">${session.warning_count}</td></tr>
      <tr><td style="padding:4px 8px;background:#f5f5f5"><strong>Session Status</strong></td><td style="padding:4px 8px;color:#c0392b"><strong>LOCKED</strong></td></tr>
    </table>

    <h3>Violation Log</h3>
    <table style="border-collapse:collapse;width:100%;font-size:13px">
      <thead>
        <tr style="background:#f0f0f0">
          <th style="padding:4px 8px;border:1px solid #ddd;text-align:left">Event</th>
          <th style="padding:4px 8px;border:1px solid #ddd;text-align:left">Timestamp</th>
          <th style="padding:4px 8px;border:1px solid #ddd;text-align:left">Metadata</th>
        </tr>
      </thead>
      <tbody>${logRows}</tbody>
    </table>

    <p style="margin-top:16px">
      <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/admin/reports/${session_id}"
         style="background:#2c3e50;color:#fff;padding:8px 16px;text-decoration:none;border-radius:4px">
        View Full Report
      </a>
    </p>

    <p style="color:#888;font-size:12px;margin-top:24px">
      This alert was generated automatically by the AI Proctoring System.<br>
      Session ID: ${session_id} | Locked at: ${new Date().toISOString()}
    </p>
  </div>
</body>
</html>`;

    const recipients = [];
    if (lecturer?.email) recipients.push(lecturer.email);
    // Always CC the admin address if configured
    if (process.env.ADMIN_EMAIL) recipients.push(process.env.ADMIN_EMAIL);

    if (recipients.length === 0) {
      logger.warn(`sendLecturerAlert: no recipients for session ${session_id}`);
      return;
    }

    const transport = getTransporter();
    if (!transport) {
      logger.warn(`sendLecturerAlert: email skipped (no transporter available) for session ${session_id}`);
      return;
    }
    const info = await transport.sendMail({
      from: process.env.SMTP_FROM || '"AI Proctoring System" <no-reply@proctoring.udom.ac.tz>',
      to: recipients.join(', '),
      subject: `[ALERT] Exam Violation — ${student?.full_name || 'Student'} (${student?.registration_number || ''}) — ${exam?.title || 'Exam'}`,
      html
    });

    logger.info(`Alert email sent for session ${session_id}. MessageId: ${info.messageId}`);

    // Log Ethereal preview URL in dev mode
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      logger.info(`Ethereal preview: ${previewUrl}`);
      console.log(`\n📧  ETHEREAL EMAIL PREVIEW: ${previewUrl}\n`);
    }
  } catch (err) {
    logger.error(`sendLecturerAlert failed for session ${session_id}: ${err.message}`);
  }
}

module.exports = { sendLecturerAlert };
