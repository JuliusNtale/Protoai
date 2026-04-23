'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Report = sequelize.define('Report', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    session_id: { type: DataTypes.INTEGER, allowNull: false, unique: true },
    total_anomalies: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    warning_count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    risk_level: {
      type: DataTypes.ENUM('low', 'medium', 'high'),
      allowNull: false,
      defaultValue: 'low'
    },
    flagged: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    generated_at: { type: DataTypes.DATE, allowNull: true }
  }, {
    tableName: 'reports',
    underscored: true
  });

  return Report;
};
