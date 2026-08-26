const { getAllPolicies, setPolicy } = require('../utils/policyEngine');
const { logEvent } = require('../utils/auditLogger');

async function listPolicies(req, res) {
  const policies = await getAllPolicies();
  res.json(policies);
}

async function updatePolicy(req, res) {
  const { key } = req.params;
  const { value } = req.body;

  if (value === undefined || value === null || value === '') {
    return res.status(400).json({ error: 'value is required' });
  }

  const policy = await setPolicy(key, String(value), req.user.employeeId);

  await logEvent({
    eventType: 'POLICY_CHANGE',
    actorId: req.user.employeeId,
    ipAddress: req.ip,
    details: { key, newValue: value },
    severity: 'warning', // policy changes are sensitive, always worth flagging
  });

  res.json(policy);
}

module.exports = { listPolicies, updatePolicy };
