const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Each log entry stores the hash of the PREVIOUS entry + its own data.
// This creates a hash chain: if any past entry is edited, every
// subsequent hash becomes invalid on verification -> tamper evidence.
const AuditLog = sequelize.define('AuditLog', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  eventType: {
    type: DataTypes.STRING, // LOGIN_SUCCESS, LOGIN_FAILED, POLICY_CHANGE, ALERT, etc.
    allowNull: false,
  },
  actorId: {
    type: DataTypes.STRING, // employeeId or 'SYSTEM'
    allowNull: true,
  },
  ipAddress: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  details: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  severity: {
    type: DataTypes.ENUM('info', 'warning', 'critical'),
    defaultValue: 'info',
  },
  prevHash: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  hash: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  timestamp: {
    // Explicit, deterministic timestamp used in hash computation.
    // (Sequelize's own createdAt isn't known until after insert, so we
    // can't use it to compute a hash that gets stored in the same row.)
    type: DataTypes.STRING,
    allowNull: false,
  },
});

module.exports = AuditLog;
