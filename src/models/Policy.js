const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Policies are stored as key-value config the app enforces at runtime.
// e.g. key='MAX_LOGIN_ATTEMPTS', value='5'
const Policy = sequelize.define('Policy', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  key: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
  },
  value: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  updatedBy: {
    type: DataTypes.STRING, // employeeId of admin who last changed it
    allowNull: true,
  },
});

module.exports = Policy;
