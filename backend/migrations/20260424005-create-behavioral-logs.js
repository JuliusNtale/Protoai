'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('behavioral_logs', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      session_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'exam_sessions', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      event_type: {
        type: Sequelize.ENUM('gaze_away', 'head_movement', 'tab_switch', 'face_absent', 'multiple_persons'),
        allowNull: false
      },
      metadata: {
        type: Sequelize.JSON,
        allowNull: true
      },
      event_timestamp: {
        type: Sequelize.DATE,
        allowNull: false
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });

    await queryInterface.addIndex('behavioral_logs', ['session_id']);
    await queryInterface.addIndex('behavioral_logs', ['event_timestamp']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('behavioral_logs');
  }
};
