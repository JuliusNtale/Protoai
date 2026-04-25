'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Question = sequelize.define('Question', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    exam_id: { type: DataTypes.INTEGER, allowNull: false },
    question_text: { type: DataTypes.TEXT, allowNull: false },
    question_type: {
      type: DataTypes.ENUM('mcq', 'true_false', 'short_answer'),
      allowNull: false
    },
    options: { type: DataTypes.JSON, allowNull: true },
    correct_answer: { type: DataTypes.STRING(500), allowNull: true },
    marks: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 }
  }, {
    tableName: 'questions',
    underscored: true
  });

  return Question;
};
