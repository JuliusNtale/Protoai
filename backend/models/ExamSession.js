'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ExamSession = sequelize.define('ExamSession', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    student_id: { type: DataTypes.INTEGER, allowNull: false },
    exam_id: { type: DataTypes.INTEGER, allowNull: false },
    identity_verified: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    verification_score: { type: DataTypes.FLOAT, allowNull: true },
    session_status: {
      type: DataTypes.ENUM('active', 'completed', 'locked'),
      allowNull: false,
      defaultValue: 'active'
    },
    warning_count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    answers: { type: DataTypes.JSON, allowNull: true },
    started_at: { type: DataTypes.DATE, allowNull: true },
    submitted_at: { type: DataTypes.DATE, allowNull: true }
  }, {
    tableName: 'exam_sessions',
    underscored: true
  });

  return ExamSession;
};
