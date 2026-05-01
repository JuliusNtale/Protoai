'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'temp_password_expiry', {
      type: Sequelize.DATE,
      allowNull: true,
      defaultValue: null,
      after: 'password_hash'
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('users', 'temp_password_expiry');
  }
};
