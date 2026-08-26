const express = require('express');
const { listPolicies, updatePolicy } = require('../controllers/policyController');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, requireRole('admin', 'manager'), listPolicies);
router.put('/:key', authenticate, requireRole('admin'), updatePolicy);

module.exports = router;
