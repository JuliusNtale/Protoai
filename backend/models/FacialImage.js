'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const FacialImage = sequelize.define('FacialImage', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    student_id: { type: DataTypes.INTEGER, allowNull: false, unique: true },
    image_path: { type: DataTypes.STRING(500), allowNull: false }
  }, {
    tableName: 'facial_images',
    underscored: true
  });

  return FacialImage;
};
