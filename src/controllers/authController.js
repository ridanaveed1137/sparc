const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { getPolicy } = require('../utils/policyEngine');
const { logEvent } = require('../utils/auditLogger');

const SALT_ROUNDS = 12;

function validatePasswordComplexity(password, minLength) {
  if (password.length < minLength) return `Password must be at least ${minLength} characters`;
  if (!/[A-Z]/.test(password)) return 'Password must contain an uppercase letter';
  if (!/[a-z]/.test(password)) return 'Password must contain a lowercase letter';
  if (!/[0-9]/.test(password)) return 'Password must contain a number';
  if (!/[^A-Za-z0-9]/.test(password)) return 'Password must contain a symbol';
  return null;
}

// Admin-only: onboard a new employee
async function register(req, res) {
  try {
    const { employeeId, fullName, email, password, role } = req.body;

    const minLength = parseInt((await getPolicy('PASSWORD_MIN_LENGTH')) || '10', 10);
    const requireComplexity = (await getPolicy('PASSWORD_REQUIRE_COMPLEXITY')) === 'true';

    if (requireComplexity) {
      const err = validatePasswordComplexity(password, minLength);
      if (err) return res.status(400).json({ error: err });
    } else if (password.length < minLength) {
      return res.status(400).json({ error: `Password must be at least ${minLength} characters` });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await User.create({
      employeeId,
      fullName,
      email,
      passwordHash,
      role: role === 'admin' || role === 'manager' ? role : 'employee',
    });

    await logEvent({
      eventType: 'USER_CREATED',
      actorId: req.user ? req.user.employeeId : 'SYSTEM',
      ipAddress: req.ip,
      details: { newUser: employeeId, role: user.role },
      severity: 'info',
    });

    res.status(201).json({ id: user.id, employeeId: user.employeeId, role: user.role });
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: 'Employee ID or email already in use' });
    }
    res.status(500).json({ error: 'Registration failed', detail: err.message });
  }
}

async function login(req, res) {
  try {
    const { employeeId, password } = req.body;
    const ipAddress = req.ip;

    const user = await User.findOne({ where: { employeeId } });

    if (!user) {
      await logEvent({
        eventType: 'LOGIN_FAILED',
        actorId: employeeId,
        ipAddress,
        details: 'No such employeeId',
        severity: 'warning',
      });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (user.isLocked) {
      await logEvent({
        eventType: 'LOGIN_BLOCKED_LOCKED_ACCOUNT',
        actorId: employeeId,
        ipAddress,
        severity: 'warning',
      });
      return res.status(423).json({ error: 'Account is locked. Contact an administrator.' });
    }

    // Policy: restrict login hours
    const startHour = parseInt((await getPolicy('ALLOWED_LOGIN_START_HOUR')) || '0', 10);
    const endHour = parseInt((await getPolicy('ALLOWED_LOGIN_END_HOUR')) || '23', 10);
    const currentHour = new Date().getHours();
    if (currentHour < startHour || currentHour > endHour) {
      await logEvent({
        eventType: 'LOGIN_BLOCKED_OUTSIDE_HOURS',
        actorId: employeeId,
        ipAddress,
        details: { currentHour, allowed: [startHour, endHour] },
        severity: 'warning',
      });
      return res.status(403).json({ error: 'Login not permitted at this hour per security policy' });
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);

    if (!passwordMatches) {
      const maxAttempts = parseInt((await getPolicy('MAX_LOGIN_ATTEMPTS')) || '5', 10);
      user.failedLoginAttempts += 1;

      if (user.failedLoginAttempts >= maxAttempts) {
        user.isLocked = true;
        await logEvent({
          eventType: 'ACCOUNT_LOCKED',
          actorId: employeeId,
          ipAddress,
          details: `Locked after ${user.failedLoginAttempts} failed attempts`,
          severity: 'critical',
        });
      } else {
        await logEvent({
          eventType: 'LOGIN_FAILED',
          actorId: employeeId,
          ipAddress,
          details: `Attempt ${user.failedLoginAttempts}/${maxAttempts}`,
          severity: 'warning',
        });
      }

      await user.save();
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Anomaly check: login from a new/different IP than last time
    if (user.lastLoginIp && user.lastLoginIp !== ipAddress) {
      await logEvent({
        eventType: 'ANOMALY_NEW_IP_LOGIN',
        actorId: employeeId,
        ipAddress,
        details: { previousIp: user.lastLoginIp, newIp: ipAddress },
        severity: 'warning',
      });
    }

    // Policy: password rotation check
    const maxAgeDays = parseInt((await getPolicy('PASSWORD_MAX_AGE_DAYS')) || '90', 10);
    const ageDays = (Date.now() - new Date(user.passwordChangedAt).getTime()) / (1000 * 60 * 60 * 24);
    const passwordExpired = ageDays > maxAgeDays;

    user.failedLoginAttempts = 0;
    user.lastLoginAt = new Date();
    user.lastLoginIp = ipAddress;
    await user.save();

    const sessionMinutes = parseInt((await getPolicy('SESSION_TIMEOUT_MINUTES')) || '30', 10);
    const token = jwt.sign(
      { id: user.id, employeeId: user.employeeId, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: `${sessionMinutes}m` }
    );

    await logEvent({
      eventType: 'LOGIN_SUCCESS',
      actorId: employeeId,
      ipAddress,
      severity: 'info',
    });

    res.json({
      token,
      expiresInMinutes: sessionMinutes,
      passwordExpired,
      user: { employeeId: user.employeeId, fullName: user.fullName, role: user.role },
    });
  } catch (err) {
    res.status(500).json({ error: 'Login failed', detail: err.message });
  }
}

module.exports = { register, login };
