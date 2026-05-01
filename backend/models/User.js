'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const User = sequelize.define('User', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    registration_number: { type: DataTypes.STRING(20), allowNull: false, unique: true },
    full_name: { type: DataTypes.STRING(100), allowNull: false },
    email: { type: DataTypes.STRING(150), allowNull: false, unique: true },
    phone_number: { type: DataTypes.STRING(20), allowNull: true },
    password_hash: { type: DataTypes.STRING(255), allowNull: false },
    temp_password_expiry: { type: DataTypes.DATE, allowNull: true, defaultValue: null },
    role: {
      type: DataTypes.ENUM('student', 'lecturer', 'administrator'),
      allowNull: false,
      defaultValue: 'student'
    },
    is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true }
  }, {
    tableName: 'users',
    underscored: true,
    defaultScope: {
      attributes: { exclude: ['password_hash'] }
    },
    scopes: {
      withPassword: { attributes: {} }
    }
  });

  return User;
};
