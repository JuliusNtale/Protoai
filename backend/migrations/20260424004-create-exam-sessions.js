'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('exam_sessions', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      student_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      exam_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'examinations', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      identity_verified: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      verification_score: {
        type: Sequelize.FLOAT,
        allowNull: true
      },
      session_status: {
        type: Sequelize.ENUM('active', 'completed', 'locked'),
        allowNull: false,
        defaultValue: 'active'
      },
      warning_count: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      answers: {
        type: Sequelize.JSON,
        allowNull: true
      },
      started_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      submitted_at: {
        type: Sequelize.DATE,
        allowNull: true
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

    await queryInterface.addIndex('exam_sessions', ['student_id']);
    await queryInterface.addIndex('exam_sessions', ['exam_id']);
    await queryInterface.addIndex('exam_sessions', ['session_status']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('exam_sessions');
  }
};
