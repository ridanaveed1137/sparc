const express = require('express');
const { body, validationResult } = require('express-validator');
const { register, login } = require('../controllers/authController');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  next();
}

// Only an admin can create new employee accounts.
router.post(
  '/register',
  authenticate,
  requireRole('admin'),
  [
    body('employeeId').notEmpty(),
    body('fullName').notEmpty(),
    body('email').isEmail(),
    body('password').notEmpty(),
  ],
  validate,
  register
);

router.post(
  '/login',
  [body('employeeId').notEmpty(), body('password').notEmpty()],
  validate,
  login
);

module.exports = router;
