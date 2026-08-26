const { Op } = require('sequelize');
const AuditLog = require('../models/AuditLog');
const User = require('../models/User');
const { verifyChain } = require('../utils/auditLogger');

// Returns recent security-relevant events (warnings + critical) — the
// "notifications" the admin sees for leaks/vulnerabilities.
async function getAlerts(req, res) {
  const alerts = await AuditLog.findAll({
    where: { severity: { [Op.in]: ['warning', 'critical'] } },
    order: [['id', 'DESC']],
    limit: 100,
  });
  res.json(alerts);
}

async function getAllLogs(req, res) {
  const logs = await AuditLog.findAll({ order: [['id', 'DESC']], limit: 500 });
  res.json(logs);
}

async function getIntegrityStatus(req, res) {
  const result = await verifyChain();
  res.json(result);
}

async function getSummary(req, res) {
  const totalUsers = await User.count();
  const lockedUsers = await User.count({ where: { isLocked: true } });
  const criticalAlerts = await AuditLog.count({ where: { severity: 'critical' } });
  const warningAlerts = await AuditLog.count({ where: { severity: 'warning' } });

  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentFailedLogins = await AuditLog.count({
    where: { eventType: 'LOGIN_FAILED', createdAt: { [Op.gte]: since24h } },
  });

  res.json({ totalUsers, lockedUsers, criticalAlerts, warningAlerts, recentFailedLogins });
}

module.exports = { getAlerts, getAllLogs, getIntegrityStatus, getSummary };
