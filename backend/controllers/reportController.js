'use strict';
const { ExamSession, Report, BehavioralLog, User, Examination } = require('../models');
const { generateReport } = require('../services/reportService');
const logger = require('../utils/logger');

async function getReport(req, res) {
  const { session_id } = req.params;

  try {
    // Generate report on-demand if it doesn't exist yet
    let report = await Report.findOne({ where: { session_id } });
    if (!report) {
      await generateReport(session_id);
      report = await Report.findOne({ where: { session_id } });
    }

    const session = await ExamSession.findByPk(session_id, {
      include: [
        { model: User, as: 'student', attributes: ['id', 'registration_number', 'full_name', 'email'] },
        { model: Examination, as: 'exam', attributes: ['id', 'title', 'duration_minutes'] }
      ]
    });

    if (!session) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Session not found' } });
    }

    const logs = await BehavioralLog.findAll({
      where: { session_id },
      attributes: ['event_type', 'metadata', 'event_timestamp'],
      order: [['event_timestamp', 'ASC']]
    });

    return res.status(200).json({
      session: {
        id: session.id,
        student_id: session.student_id,
        exam_id: session.exam_id,
        warning_count: session.warning_count,
        session_status: session.session_status,
        identity_verified: session.identity_verified,
        started_at: session.started_at,
        submitted_at: session.submitted_at
      },
      student: session.student,
      exam: session.exam,
      report: report || null,
      behavioral_logs: logs
    });
  } catch (err) {
    logger.error(`getReport error: ${err.message}`);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch report' } });
  }
}

async function flagReport(req, res) {
  const { session_id } = req.params;
  const { flagged } = req.body;

  if (typeof flagged !== 'boolean') {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'flagged must be a boolean' } });
  }

  try {
    const report = await Report.findOne({ where: { session_id } });
    if (!report) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Report not found' } });
    }

    await report.update({ flagged });
    return res.status(200).json({ ok: true, flagged: report.flagged });
  } catch (err) {
    logger.error(`flagReport error: ${err.message}`);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to flag report' } });
  }
}

async function exportCsv(req, res) {
  const { exam_id } = req.params;

  try {
    const sessions = await ExamSession.findAll({
      where: { exam_id },
      include: [
        { model: User, as: 'student', attributes: ['full_name', 'registration_number'] },
        { model: Report, as: 'report' }
      ]
    });

    const header = 'student_name,reg_number,start_time,end_time,identity_verified,warning_count,session_status,total_anomalies,risk_level,flagged\n';
    const rows = sessions.map(s => {
      const r = s.report;
      return [
        `"${s.student?.full_name || ''}"`,
        `"${s.student?.registration_number || ''}"`,
        s.started_at ? new Date(s.started_at).toISOString() : '',
        s.submitted_at ? new Date(s.submitted_at).toISOString() : '',
        s.identity_verified,
        s.warning_count,
        s.session_status,
        r?.total_anomalies ?? 0,
        r?.risk_level ?? 'low',
        r?.flagged ?? false
      ].join(',');
    }).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="exam-${exam_id}-report.csv"`);
    return res.send(header + rows);
  } catch (err) {
    logger.error(`exportCsv error: ${err.message}`);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to export CSV' } });
  }
}

module.exports = { getReport, flagReport, exportCsv };
