'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const BehavioralLog = sequelize.define('BehavioralLog', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    session_id: { type: DataTypes.INTEGER, allowNull: false },
    event_type: {
      type: DataTypes.ENUM('gaze_away', 'head_movement', 'tab_switch', 'face_absent', 'multiple_persons'),
      allowNull: false
    },
    metadata: { type: DataTypes.JSON, allowNull: true },
    event_timestamp: { type: DataTypes.DATE, allowNull: false }
  }, {
    tableName: 'behavioral_logs',
    underscored: true
  });

  return BehavioralLog;
};
