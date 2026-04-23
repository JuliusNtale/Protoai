'use strict';
const { Sequelize } = require('sequelize');
const config = require('../config/database');

const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  dbConfig
);

const User = require('./User')(sequelize);
const Examination = require('./Examination')(sequelize);
const Question = require('./Question')(sequelize);
const ExamSession = require('./ExamSession')(sequelize);
const BehavioralLog = require('./BehavioralLog')(sequelize);
const FacialImage = require('./FacialImage')(sequelize);
const Report = require('./Report')(sequelize);

// Associations
User.hasMany(ExamSession, { foreignKey: 'student_id', as: 'sessions' });
ExamSession.belongsTo(User, { foreignKey: 'student_id', as: 'student' });

User.hasOne(FacialImage, { foreignKey: 'student_id', as: 'facialImage' });
FacialImage.belongsTo(User, { foreignKey: 'student_id', as: 'student' });

Examination.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });
User.hasMany(Examination, { foreignKey: 'created_by', as: 'exams' });

Examination.hasMany(Question, { foreignKey: 'exam_id', as: 'questions' });
Question.belongsTo(Examination, { foreignKey: 'exam_id', as: 'exam' });

Examination.hasMany(ExamSession, { foreignKey: 'exam_id', as: 'sessions' });
ExamSession.belongsTo(Examination, { foreignKey: 'exam_id', as: 'exam' });

ExamSession.hasMany(BehavioralLog, { foreignKey: 'session_id', as: 'logs' });
BehavioralLog.belongsTo(ExamSession, { foreignKey: 'session_id', as: 'session' });

ExamSession.hasOne(Report, { foreignKey: 'session_id', as: 'report' });
Report.belongsTo(ExamSession, { foreignKey: 'session_id', as: 'session' });

module.exports = {
  sequelize,
  Sequelize,
  User,
  Examination,
  Question,
  ExamSession,
  BehavioralLog,
  FacialImage,
  Report
};
