'use strict';
const { validationResult } = require('express-validator');
const { sequelize, ExamSession, BehavioralLog } = require('../models');
const { generateReport } = require('../services/reportService');
const { sendLecturerAlert } = require('../services/emailService');
const logger = require('../utils/logger');

const WARNING_THRESHOLD = 3;

function normaliseEventType(eventType) {
  if (eventType === 'head_movement') return 'head_turned';
  if (eventType === 'multiple_persons') return 'multiple_faces';
  return eventType;
}

async function logAnomaly(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: errors.array()[0].msg } });
  }

  const { session_id, metadata } = req.body;
  const event_type = normaliseEventType(req.body.event_type);
  const event_data = req.body.event_data || metadata || {};

  try {
    const result = await sequelize.transaction(async (t) => {
      // SELECT with row lock — prevents race condition on simultaneous requests
      const session = await ExamSession.findByPk(session_id, {
        lock: t.LOCK.UPDATE,
        transaction: t
      });

      if (!session) {
        return { notFound: true };
      }

      if (session.session_status !== 'active') {
        return {
          locked: true,
          session_status: session.session_status,
          warning_count: session.warning_count
        };
      }

      // Insert behavioral log entry
      await BehavioralLog.create({
        session_id,
        event_type,
        metadata: event_data,
        event_timestamp: new Date()
      }, { transaction: t });

      // Increment warning count
      session.warning_count += 1;
      await session.save({ transaction: t });

      const escalated = session.warning_count >= WARNING_THRESHOLD;

      if (escalated) {
        session.session_status = 'locked';
        session.submitted_at = new Date();
        await session.save({ transaction: t });
      }

      return {
        warning_count: session.warning_count,
        escalated,
        session_status: session.session_status
      };
    });

    if (result.notFound) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Session not found' } });
    }

    if (result.locked) {
      return res.status(400).json({
        error: { code: 'SESSION_LOCKED', message: 'Session is already locked or completed' },
        warning_count: result.warning_count,
        session_status: result.session_status
      });
    }

    // Fire post-lock tasks outside the transaction so failures don't roll back the DB write
    if (result.escalated) {
      setImmediate(() => generateReport(session_id));
      setImmediate(() => sendLecturerAlert(session_id));
      logger.warn(`Session ${session_id} locked after ${result.warning_count} warnings`);
    }

    logger.info(`Anomaly logged: session=${session_id} type=${event_type} warnings=${result.warning_count}`);

    return res.status(200).json({
      ok: true,
      event_type,
      warning_count: result.warning_count,
      escalated: result.escalated,
      session_status: result.session_status
    });
  } catch (err) {
    logger.error(`logAnomaly error: ${err.message}`);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to log anomaly' } });
  }
}

module.exports = { logAnomaly, normaliseEventType };
