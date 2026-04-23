'use strict';
const { validationResult } = require('express-validator');
const { ExamSession, Examination, Question, User } = require('../models');
const { generateReport } = require('../services/reportService');
const logger = require('../utils/logger');

async function startSession(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: errors.array()[0].msg } });
  }

  const { exam_id } = req.body;
  const student_id = req.user.user_id;

  try {
    const exam = await Examination.findByPk(exam_id, {
      include: [{ model: Question, as: 'questions' }]
    });

    if (!exam) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Exam not found' } });
    }

    if (exam.status !== 'active') {
      return res.status(400).json({ error: { code: 'EXAM_NOT_ACTIVE', message: 'This exam is not currently available' } });
    }

    // Prevent duplicate active sessions for same student + exam
    const existing = await ExamSession.findOne({
      where: { student_id, exam_id, session_status: 'active' }
    });

    if (existing) {
      return res.status(409).json({
        error: { code: 'SESSION_EXISTS', message: 'You already have an active session for this exam' },
        session_id: existing.id
      });
    }

    const session = await ExamSession.create({
      student_id,
      exam_id,
      identity_verified: false,
      warning_count: 0,
      session_status: 'active',
      started_at: new Date()
    });

    return res.status(201).json({
      session_id: session.id,
      exam: {
        id: exam.id,
        title: exam.title,
        duration_minutes: exam.duration_minutes,
        total_questions: exam.questions.length
      }
    });
  } catch (err) {
    logger.error('startSession error: ' + err.message);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to start session' } });
  }
}

async function verifyIdentity(req, res) {
  // Called by Flask AI service using X-Internal-Token — not by student JWT
  const { session_id, match, confidence_score } = req.body;

  if (!session_id || match === undefined || confidence_score === undefined) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'session_id, match, and confidence_score are required' } });
  }

  try {
    const session = await ExamSession.findByPk(session_id);

    if (!session) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Session not found' } });
    }

    if (session.session_status !== 'active') {
      return res.status(400).json({ error: { code: 'INVALID_STATE', message: 'Session is not active' } });
    }

    const verified = match === true && confidence_score > 0.6;

    await session.update({
      identity_verified: verified,
      verification_score: confidence_score
    });

    return res.status(200).json({
      ok: true,
      identity_verified: verified,
      verification_score: confidence_score
    });
  } catch (err) {
    logger.error('verifyIdentity error: ' + err.message);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to verify identity' } });
  }
}

async function submitSession(req, res) {
  const session_id = req.params.id;
  const student_id = req.user.user_id;

  try {
    const session = await ExamSession.findByPk(session_id);

    if (!session) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Session not found' } });
    }

    if (session.student_id !== student_id) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'This is not your session' } });
    }

    if (session.session_status === 'locked') {
      return res.status(400).json({ error: { code: 'SESSION_LOCKED', message: 'Session was auto-submitted due to violations' } });
    }

    if (session.session_status === 'completed') {
      return res.status(400).json({ error: { code: 'ALREADY_SUBMITTED', message: 'Session already submitted' } });
    }

    const { answers } = req.body;

    await session.update({
      answers: answers || session.answers || {},
      session_status: 'completed',
      submitted_at: new Date()
    });

    // Generate report asynchronously — don't block the response
    setImmediate(() => generateReport(session_id));

    return res.status(200).json({
      status: 'completed',
      submitted_at: session.submitted_at
    });
  } catch (err) {
    logger.error('submitSession error: ' + err.message);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to submit session' } });
  }
}

module.exports = { startSession, verifyIdentity, submitSession };
