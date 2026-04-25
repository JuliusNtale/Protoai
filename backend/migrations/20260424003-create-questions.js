'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('questions', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      exam_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'examinations', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      question_text: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      question_type: {
        type: Sequelize.ENUM('mcq', 'true_false', 'short_answer'),
        allowNull: false
      },
      options: {
        type: Sequelize.JSON,
        allowNull: true
      },
      correct_answer: {
        type: Sequelize.STRING(500),
        allowNull: true
      },
      marks: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1
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

    await queryInterface.addIndex('questions', ['exam_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('questions');
  }
};
