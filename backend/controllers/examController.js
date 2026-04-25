'use strict';
const { validationResult } = require('express-validator');
const { Examination, Question, User } = require('../models');
const logger = require('../utils/logger');

async function listExams(req, res) {
  try {
    const { role, user_id } = req.user;
    let where = {};

    if (role === 'student') {
      where.status = 'active';
    } else if (role === 'lecturer') {
      where.created_by = user_id;
    }
    // administrator sees all — no filter

    const exams = await Examination.findAll({
      where,
      include: [{ model: User, as: 'creator', attributes: ['id', 'full_name', 'email'] }],
      order: [['created_at', 'DESC']]
    });

    return res.status(200).json({ exams });
  } catch (err) {
    logger.error('listExams error: ' + err.message);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch exams' } });
  }
}

async function getExam(req, res) {
  try {
    const exam = await Examination.findByPk(req.params.id, {
      include: [
        { model: Question, as: 'questions', order: [['id', 'ASC']] },
        { model: User, as: 'creator', attributes: ['id', 'full_name', 'email'] }
      ]
    });

    if (!exam) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Exam not found' } });
    }

    // Students can only see active exams
    if (req.user.role === 'student' && exam.status !== 'active') {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Exam is not available' } });
    }

    return res.status(200).json({ exam });
  } catch (err) {
    logger.error('getExam error: ' + err.message);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch exam' } });
  }
}

async function createExam(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: errors.array()[0].msg } });
  }

  try {
    const { title, description, duration_minutes, scheduled_at, questions: questionData } = req.body;

    const exam = await Examination.create({
      title,
      description: description || null,
      created_by: req.user.user_id,
      duration_minutes,
      scheduled_at: scheduled_at || null,
      status: 'draft'
    });

    // Optionally create questions in the same request
    if (Array.isArray(questionData) && questionData.length > 0) {
      const rows = questionData.map(q => ({
        exam_id: exam.id,
        question_text: q.text || q.question_text,
        question_type: q.type || q.question_type,
        options: q.options || null,
        correct_answer: q.correct_answer || q.correctAnswer || null,
        marks: q.marks || 1
      }));
      await Question.bulkCreate(rows);
    }

    const created = await Examination.findByPk(exam.id, {
      include: [{ model: Question, as: 'questions' }]
    });

    return res.status(201).json({ exam: created });
  } catch (err) {
    logger.error('createExam error: ' + err.message);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to create exam' } });
  }
}

async function updateExam(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: errors.array()[0].msg } });
  }

  try {
    const exam = await Examination.findByPk(req.params.id);

    if (!exam) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Exam not found' } });
    }

    if (exam.created_by !== req.user.user_id) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'You can only edit your own exams' } });
    }

    if (exam.status === 'active' || exam.status === 'completed') {
      return res.status(400).json({ error: { code: 'INVALID_STATE', message: 'Cannot edit an active or completed exam' } });
    }

    const { title, description, duration_minutes, scheduled_at } = req.body;
    await exam.update({ title, description, duration_minutes, scheduled_at });

    return res.status(200).json({ exam });
  } catch (err) {
    logger.error('updateExam error: ' + err.message);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to update exam' } });
  }
}

async function publishExam(req, res) {
  try {
    const exam = await Examination.findByPk(req.params.id);

    if (!exam) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Exam not found' } });
    }

    if (req.user.role === 'lecturer' && exam.created_by !== req.user.user_id) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'You can only publish your own exams' } });
    }

    await exam.update({ status: 'active' });

    return res.status(200).json({ exam });
  } catch (err) {
    logger.error('publishExam error: ' + err.message);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to publish exam' } });
  }
}

module.exports = { listExams, getExam, createExam, updateExam, publishExam };
