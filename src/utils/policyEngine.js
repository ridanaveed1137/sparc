const Policy = require('../models/Policy');

// Default policies seeded on first run. Admin can change these later.
const DEFAULT_POLICIES = [
  { key: 'MAX_LOGIN_ATTEMPTS', value: '5', description: 'Failed attempts before account lockout' },
  { key: 'PASSWORD_MIN_LENGTH', value: '10', description: 'Minimum password length' },
  { key: 'PASSWORD_REQUIRE_COMPLEXITY', value: 'true', description: 'Require upper/lower/number/symbol' },
  { key: 'SESSION_TIMEOUT_MINUTES', value: '30', description: 'JWT/session expiry in minutes' },
  { key: 'PASSWORD_MAX_AGE_DAYS', value: '90', description: 'Force password rotation after N days' },
  { key: 'ALLOWED_LOGIN_START_HOUR', value: '0', description: 'Earliest hour (0-23) logins are allowed' },
  { key: 'ALLOWED_LOGIN_END_HOUR', value: '23', description: 'Latest hour (0-23) logins are allowed' },
];

async function seedDefaultPolicies() {
  for (const p of DEFAULT_POLICIES) {
    await Policy.findOrCreate({ where: { key: p.key }, defaults: p });
  }
}

async function getPolicy(key) {
  const policy = await Policy.findOne({ where: { key } });
  return policy ? policy.value : null;
}

async function getAllPolicies() {
  return Policy.findAll({ order: [['key', 'ASC']] });
}

async function setPolicy(key, value, updatedBy) {
  const [policy] = await Policy.findOrCreate({ where: { key }, defaults: { value, updatedBy } });
  policy.value = value;
  policy.updatedBy = updatedBy;
  await policy.save();
  return policy;
}

module.exports = { seedDefaultPolicies, getPolicy, getAllPolicies, setPolicy, DEFAULT_POLICIES };
