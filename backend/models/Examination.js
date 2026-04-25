'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Examination = sequelize.define('Examination', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    title: { type: DataTypes.STRING(255), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    created_by: { type: DataTypes.INTEGER, allowNull: false },
    scheduled_at: { type: DataTypes.DATE, allowNull: true },
    duration_minutes: { type: DataTypes.INTEGER, allowNull: false },
    status: {
      type: DataTypes.ENUM('draft', 'scheduled', 'active', 'completed'),
      allowNull: false,
      defaultValue: 'draft'
    }
  }, {
    tableName: 'examinations',
    underscored: true
  });

  return Examination;
};
