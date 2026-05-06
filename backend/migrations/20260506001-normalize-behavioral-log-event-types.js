'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(
        "UPDATE behavioral_logs SET event_type = 'head_turned' WHERE event_type = 'head_movement'",
        { transaction }
      );
      await queryInterface.sequelize.query(
        "UPDATE behavioral_logs SET event_type = 'multiple_faces' WHERE event_type = 'multiple_persons'",
        { transaction }
      );

      await queryInterface.changeColumn(
        'behavioral_logs',
        'event_type',
        {
          type: Sequelize.ENUM('gaze_away', 'head_turned', 'tab_switch', 'face_absent', 'multiple_faces'),
          allowNull: false
        },
        { transaction }
      );
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(
        "UPDATE behavioral_logs SET event_type = 'head_movement' WHERE event_type = 'head_turned'",
        { transaction }
      );
      await queryInterface.sequelize.query(
        "UPDATE behavioral_logs SET event_type = 'multiple_persons' WHERE event_type = 'multiple_faces'",
        { transaction }
      );

      await queryInterface.changeColumn(
        'behavioral_logs',
        'event_type',
        {
          type: Sequelize.ENUM('gaze_away', 'head_movement', 'tab_switch', 'face_absent', 'multiple_persons'),
          allowNull: false
        },
        { transaction }
      );
    });
  }
};
