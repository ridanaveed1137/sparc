const express = require('express');
const {
  getAlerts,
  getAllLogs,
  getIntegrityStatus,
  getSummary,
} = require('../controllers/dashboardController');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/summary', authenticate, requireRole('admin', 'manager'), getSummary);
router.get('/alerts', authenticate, requireRole('admin', 'manager'), getAlerts);
router.get('/logs', authenticate, requireRole('admin'), getAllLogs);
router.get('/integrity', authenticate, requireRole('admin'), getIntegrityStatus);

module.exports = router;
