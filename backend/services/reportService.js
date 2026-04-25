'use strict';
const { ExamSession, BehavioralLog, Report } = require('../models');
const logger = require('../utils/logger');

async function generateReport(session_id) {
  try {
    const session = await ExamSession.findByPk(session_id);
    if (!session) return;

    const total_anomalies = await BehavioralLog.count({ where: { session_id } });
    const warning_count = session.warning_count;

    let risk_level;
    if (total_anomalies > 10 || warning_count >= 3) risk_level = 'high';
    else if (total_anomalies > 5) risk_level = 'medium';
    else risk_level = 'low';

    const existing = await Report.findOne({ where: { session_id } });
    if (existing) {
      await existing.update({ total_anomalies, warning_count, risk_level, generated_at: new Date() });
    } else {
      await Report.create({
        session_id,
        total_anomalies,
        warning_count,
        risk_level,
        flagged: false,
        generated_at: new Date()
      });
    }

    logger.info(`Report generated for session ${session_id}: risk=${risk_level}, anomalies=${total_anomalies}`);
  } catch (err) {
    logger.error(`generateReport failed for session ${session_id}: ${err.message}`);
  }
}

module.exports = { generateReport };
